import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export async function getSession(): Promise<Session | null> {
  return auth();
}

/**
 * Use in server components/actions that require any authenticated user.
 *
 * The session JWT is only refreshed at login (session strategy is "jwt", not "database"), so
 * it can hold a stale role/status for up to the token's full lifetime — an admin deactivating a
 * rep, or changing anyone's role, would otherwise have no effect until that user's existing
 * session naturally expires. Every call here re-checks the current status/role straight from
 * the database (this runs server-side only, in Node — never in Edge middleware) so
 * deactivation and role changes take effect on the very next request.
 */
export async function requireUser(): Promise<Session["user"]> {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, role: true },
  });
  if (!current || current.status !== "ACTIVE") redirect("/login");

  return { ...session.user, role: current.role };
}

/** Use in server components/actions restricted to administrators. */
export async function requireAdmin(): Promise<Session["user"]> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
