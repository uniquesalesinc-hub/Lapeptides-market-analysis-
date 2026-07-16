import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CLIENT_SESSION_COOKIE } from "@/lib/clientCookie";
import { signClientToken, verifyClientToken } from "@/lib/clientAuthToken";

/**
 * Client-portal (storefront) session management. A SEPARATE auth surface from the rep/admin
 * NextAuth session: this cookie is verified only here, and requireUser/requireAdmin never
 * look at it, so (portal) routes stay unreachable with a client cookie by construction.
 * Symmetrically, nothing here reads the NextAuth session, so a logged-in rep gets no client
 * access either.
 *
 * The middleware only checks cookie PRESENCE for store account routes (it runs on the Edge,
 * without node:crypto or Prisma); every function here re-verifies the HMAC signature and
 * expiry AND re-checks PortalUser.status straight from the database, so a tampered/expired
 * cookie or a just-disabled account is rejected on the very next request - the same
 * defense-in-depth split the rep surface uses (middleware presence check + session.ts DB check).
 */

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000; // only touch lastActiveAt when >5 min stale

export interface ClientSessionUser {
  id: string;
  customerId: string;
  name: string;
  email: string;
  customerName: string;
}

/**
 * Issues the signed session cookie for a portal user. Only callable where Next.js allows
 * cookie writes (server actions / route handlers) - i.e. from the login action.
 */
export async function createClientSession(portalUser: { id: string; customerId: string }): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = signClientToken({ pu: portalUser.id, c: portalUser.customerId, exp }, secret);

  cookies().set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Clears the session cookie. Only callable from server actions / route handlers. */
export async function destroyClientSession(): Promise<void> {
  cookies().delete(CLIENT_SESSION_COOKIE);
}

/**
 * Non-throwing session read for optional-auth surfaces (the store masthead). Verifies the
 * cookie signature + expiry and requires the portal user to still be ACTIVE; anything less
 * returns null. Also cross-checks the customerId baked into the token against the database
 * row, so a session cannot outlive a portal user being moved to a different customer.
 */
export async function getClientSession(): Promise<ClientSessionUser | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const raw = cookies().get(CLIENT_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const payload = verifyClientToken(raw, secret);
  if (!payload) return null;

  const portalUser = await prisma.portalUser.findUnique({
    where: { id: payload.pu },
    select: {
      id: true,
      customerId: true,
      name: true,
      email: true,
      status: true,
      lastActiveAt: true,
      customer: { select: { businessName: true } },
    },
  });
  if (!portalUser) return null;
  if (portalUser.status !== "ACTIVE") return null;
  if (portalUser.customerId !== payload.c) return null;

  // Presence heartbeat, throttled so ordinary browsing doesn't write on every request.
  const now = Date.now();
  if (!portalUser.lastActiveAt || now - portalUser.lastActiveAt.getTime() > LAST_ACTIVE_THROTTLE_MS) {
    await prisma.portalUser.update({
      where: { id: portalUser.id },
      data: { lastActiveAt: new Date(now) },
    });
  }

  return {
    id: portalUser.id,
    customerId: portalUser.customerId,
    name: portalUser.name,
    email: portalUser.email,
    customerName: portalUser.customer.businessName,
  };
}

/**
 * Use in store server components/actions that require a logged-in, ACTIVE portal user.
 * Redirects to the store login when the cookie is absent, tampered, expired, or the
 * account is disabled/deleted.
 */
export async function requireClient(): Promise<ClientSessionUser> {
  const session = await getClientSession();
  if (!session) redirect("/store/login");
  return session;
}
