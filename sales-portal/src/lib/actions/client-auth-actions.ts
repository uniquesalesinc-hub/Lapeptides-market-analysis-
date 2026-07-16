"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createClientSession, destroyClientSession } from "@/lib/clientSession";
import { portalUserTransition } from "@/lib/data/portalUserTransitions";
import { createLead } from "@/lib/data/leads";
import { clientLoginSchema, clientSignupSchema } from "@/lib/validation/clientAuth";

/**
 * Client-portal (storefront) auth actions. PUBLIC entry points - no requireUser/requireAdmin
 * here by design, and none of them ever read or write the NextAuth session. Every failure
 * mode of the login (unknown email, wrong password, disabled or not-yet-invited account)
 * returns the SAME generic message so the form never confirms whether an email exists.
 */

export interface ClientAuthResult {
  ok: boolean;
  error?: string;
}

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

// Lazily built once per instance so the "unknown email" path still costs a real bcrypt
// compare (same cost factor as stored hashes), keeping its timing indistinguishable from a
// wrong-password attempt without slowing module load for logout/signup.
let dummyHash: string | null = null;
function getDummyHash(): string {
  dummyHash ??= bcrypt.hashSync("timing-equalizer-not-a-real-password", 12);
  return dummyHash;
}

/** Only follow store-internal relative paths from `?from=` - never off-site or (portal) URLs. */
function sanitizeFromPath(value: string | undefined): string {
  if (!value) return "/store/account";
  if (!value.startsWith("/store") || value.startsWith("//")) return "/store/account";
  return value;
}

export async function clientLoginAction(input: unknown): Promise<ClientAuthResult> {
  const parsed = clientLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_LOGIN_ERROR };

  const portalUser = await prisma.portalUser.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true, customerId: true, passwordHash: true, status: true },
  });

  const passwordOk = await bcrypt.compare(
    parsed.data.password,
    portalUser?.passwordHash ?? getDummyHash()
  );
  if (!portalUser || !portalUser.passwordHash || !passwordOk) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  // INVITED flips to ACTIVE on first login; DISABLED and PENDING_INVITE reject. The specific
  // rejection reason stays server-side - the caller only ever sees the generic message.
  const transition = portalUserTransition(portalUser.status, "login");
  if (!transition.ok) return { ok: false, error: GENERIC_LOGIN_ERROR };

  await prisma.portalUser.update({
    where: { id: portalUser.id },
    data: { status: transition.status, lastLoginAt: new Date(), lastActiveAt: new Date() },
  });

  await createClientSession({ id: portalUser.id, customerId: portalUser.customerId });

  redirect(sanitizeFromPath(parsed.data.from));
}

export async function clientLogoutAction(): Promise<void> {
  await destroyClientSession();
  redirect("/store/login");
}

/**
 * Storefront account request -> WEBSITE-source Lead in the admin review queue.
 * No account, credentials, or session are created here.
 */
export async function clientSignupAction(input: unknown): Promise<ClientAuthResult> {
  const parsed = clientSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  try {
    await createLead({
      company: parsed.data.company,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
      source: "WEBSITE",
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    return { ok: true };
  } catch (err) {
    console.error("[client-signup:create-lead-failed]", err);
    return { ok: false, error: "Could not submit your request. Please try again." };
  }
}
