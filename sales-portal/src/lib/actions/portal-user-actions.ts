"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { portalUserTransition } from "@/lib/data/portalUserTransitions";
import {
  createPortalUserSchema,
  portalUserIdSchema,
  resetPortalUserPasswordSchema,
} from "@/lib/validation/portalUser";

export interface PortalUserActionResult {
  ok: boolean;
  error?: string;
  portalUserId?: string;
  /** Honest delivery flag from sendEmail — false until RESEND_API_KEY is configured. */
  emailSent?: boolean;
}

function revalidatePortalUserViews() {
  revalidatePath("/customers/portal-users");
}

/**
 * Creates a client-portal login for a customer. With an initial password the account is
 * immediately usable (ACTIVE); without one it is created as PENDING_INVITE so the invite
 * flow issues access later. Same bcryptjs hashing as the seed users.
 */
export async function createPortalUserAction(input: unknown): Promise<PortalUserActionResult> {
  await requireAdmin();

  const parsed = createPortalUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid portal user." };
  }

  const password = parsed.data.password || null;

  try {
    const portalUser = await prisma.portalUser.create({
      data: {
        customerId: parsed.data.customerId,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: password ? await bcrypt.hash(password, 12) : null,
        status: password ? "ACTIVE" : "PENDING_INVITE",
      },
    });

    revalidatePortalUserViews();
    return { ok: true, portalUserId: portalUser.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A portal user with this email already exists." };
    }
    console.error("[portal-user:create-failed]", err);
    return { ok: false, error: "Could not create the portal user. Please try again." };
  }
}

/**
 * Sends (or resends) the portal invite: stamps INVITED + invitedAt, then attempts the email.
 * Delivery is honest — with no RESEND_API_KEY the status still advances (admin can set a
 * password manually) and the result carries emailSent: false so the UI says so.
 */
export async function sendPortalInviteAction(input: unknown): Promise<PortalUserActionResult> {
  await requireAdmin();

  const parsed = portalUserIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid portal user." };

  try {
    const portalUser = await prisma.portalUser.findUnique({
      where: { id: parsed.data.portalUserId },
      include: { customer: { select: { businessName: true } } },
    });
    if (!portalUser) return { ok: false, error: "Portal user not found." };

    const transition = portalUserTransition(portalUser.status, "invite");
    if (!transition.ok) return { ok: false, error: transition.error };

    await prisma.portalUser.update({
      where: { id: portalUser.id },
      data: { status: transition.status, invitedAt: new Date() },
    });

    // Store login URL: the (store) surface ships in the next tasks; the path is stable.
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const loginUrl = `${baseUrl}/store/login`;
    const result = await sendEmail({
      to: portalUser.email,
      subject: "Your LA Peptides wholesale portal access",
      html: `<p>Hi ${portalUser.name},</p>
        <p>${portalUser.customer.businessName} now has access to the LA Peptides wholesale portal. Log in to browse the catalog with your account pricing and place orders.</p>
        <p><a href="${loginUrl}">${loginUrl}</a></p>
        <p>If you do not have a password yet, your LA Peptides representative will provide one.</p>
        <p>LA Peptides</p>`,
    });

    revalidatePortalUserViews();
    return { ok: true, portalUserId: portalUser.id, emailSent: result.sent };
  } catch (err) {
    console.error("[portal-user:invite-failed]", err);
    return { ok: false, error: "Could not send the invite. Please try again." };
  }
}

/** Disables a portal login. The client session check rejects DISABLED on the next request. */
export async function disablePortalUserAction(input: unknown): Promise<PortalUserActionResult> {
  await requireAdmin();

  const parsed = portalUserIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid portal user." };

  try {
    const portalUser = await prisma.portalUser.findUnique({ where: { id: parsed.data.portalUserId } });
    if (!portalUser) return { ok: false, error: "Portal user not found." };

    const transition = portalUserTransition(portalUser.status, "disable");
    if (!transition.ok) return { ok: false, error: transition.error };

    await prisma.portalUser.update({ where: { id: portalUser.id }, data: { status: transition.status } });

    revalidatePortalUserViews();
    return { ok: true, portalUserId: portalUser.id };
  } catch (err) {
    console.error("[portal-user:disable-failed]", err);
    return { ok: false, error: "Could not disable the portal user. Please try again." };
  }
}

/** Re-enables a disabled login, restoring the most advanced pre-disable stage on record. */
export async function enablePortalUserAction(input: unknown): Promise<PortalUserActionResult> {
  await requireAdmin();

  const parsed = portalUserIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid portal user." };

  try {
    const portalUser = await prisma.portalUser.findUnique({ where: { id: parsed.data.portalUserId } });
    if (!portalUser) return { ok: false, error: "Portal user not found." };

    const transition = portalUserTransition(portalUser.status, "enable", {
      hasLoggedIn: portalUser.lastLoginAt !== null,
      wasInvited: portalUser.invitedAt !== null,
      hasPassword: portalUser.passwordHash !== null,
    });
    if (!transition.ok) return { ok: false, error: transition.error };

    await prisma.portalUser.update({ where: { id: portalUser.id }, data: { status: transition.status } });

    revalidatePortalUserViews();
    return { ok: true, portalUserId: portalUser.id };
  } catch (err) {
    console.error("[portal-user:enable-failed]", err);
    return { ok: false, error: "Could not enable the portal user. Please try again." };
  }
}

/**
 * Sets a new password for a portal user. A PENDING_INVITE account becomes ACTIVE — with
 * working credentials in hand there is nothing left to invite. Never touches DISABLED status.
 */
export async function resetPortalUserPasswordAction(input: unknown): Promise<PortalUserActionResult> {
  await requireAdmin();

  const parsed = resetPortalUserPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  try {
    const portalUser = await prisma.portalUser.findUnique({ where: { id: parsed.data.portalUserId } });
    if (!portalUser) return { ok: false, error: "Portal user not found." };

    await prisma.portalUser.update({
      where: { id: portalUser.id },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        status: portalUser.status === "PENDING_INVITE" ? "ACTIVE" : portalUser.status,
      },
    });

    revalidatePortalUserViews();
    return { ok: true, portalUserId: portalUser.id };
  } catch (err) {
    console.error("[portal-user:reset-password-failed]", err);
    return { ok: false, error: "Could not reset the password. Please try again." };
  }
}
