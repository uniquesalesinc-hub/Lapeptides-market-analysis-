"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import { signViewAs, verifyViewAs } from "@/lib/viewAsToken";

/**
 * Admin "view as rep" mechanism. This is NOT a credential swap: the auth session stays the
 * admin's, and every server ACTION keeps validating requireUser()/requireAdmin() against the
 * real session, so all writes audit as the admin. Only READ scoping flows through
 * getEffectiveViewer(), which honors a signed httpOnly cookie for ADMIN sessions exclusively.
 */

const VIEW_AS_COOKIE = "lap_view_as";

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

export type EffectiveViewer = Session["user"] & {
  /** Present only while an admin is viewing the portal as a rep. */
  viewAs?: { adminId: string; repName: string };
};

/** Server action: admin enters viewing-as mode for one active sales rep. */
export async function setViewAsRep(userId: string): Promise<void> {
  await requireAdmin(); // real session must be an admin; reps can never set this cookie

  const rep = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });
  if (!rep || rep.role !== "SALES_REP" || rep.status !== "ACTIVE") return;

  cookies().set(VIEW_AS_COOKIE, signViewAs(rep.id, authSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  revalidatePath("/", "layout");
}

/** Server action: exit viewing-as mode. Safe to call from any session. */
export async function clearViewAs(): Promise<void> {
  cookies().delete(VIEW_AS_COOKIE);
  revalidatePath("/", "layout");
}

/**
 * The viewer whose eyes READ queries should look through. Non-admin sessions always get the
 * session user back and any cookie is IGNORED, so a forged/stale cookie on a rep session can
 * never rescope data. Admin sessions with a valid-signature cookie naming an existing active
 * SALES_REP get that rep's identity (id/name/email, role SALES_REP) shaped exactly like the
 * session user the data layer consumes, plus the viewAs marker. Invalid or missing
 * signature: cookie ignored, admin sees admin data.
 */
export async function getEffectiveViewer(): Promise<EffectiveViewer> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return user;

  const raw = cookies().get(VIEW_AS_COOKIE)?.value;
  if (!raw) return user;

  const repId = verifyViewAs(raw, authSecret());
  if (!repId) return user;

  const rep = await prisma.user.findUnique({
    where: { id: repId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!rep || rep.role !== "SALES_REP" || rep.status !== "ACTIVE") return user;

  return {
    ...user,
    id: rep.id,
    name: rep.name,
    email: rep.email,
    role: "SALES_REP",
    viewAs: { adminId: user.id, repName: rep.name },
  };
}
