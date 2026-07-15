import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Session } from "next-auth";

export async function getSession(): Promise<Session | null> {
  return auth();
}

/** Use in server components/actions that require any authenticated user. */
export async function requireUser(): Promise<Session["user"]> {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Use in server components/actions restricted to administrators. */
export async function requireAdmin(): Promise<Session["user"]> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
