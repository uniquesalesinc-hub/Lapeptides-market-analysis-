import NextAuth, { CredentialsSignin } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// A fixed, valid bcrypt hash of an unguessable, unused string — compared against when no real
// user/passwordHash exists, purely so authorize() always pays the same bcrypt cost and can't be
// timed to distinguish "unknown email" from "known email, wrong password".
const DUMMY_HASH = "$2a$12$Rf0.vC/YyVJ4.kWmQah51eXjWdUo7x/7svVllyR32ERuRQwiyKXPS";

// Auth.js only ever surfaces a subclass of its own CredentialsSignin to the client — a plain
// `throw new Error("...")` from authorize() is treated as an unhandled provider crash and comes
// back to the client as the generic `error=Configuration`, never the message itself (confirmed
// against this installed next-auth version: a plain Error's message never reached the client in
// testing). The `.code` becomes the `code` query param the client actually receives.
class AccountPendingActivationError extends CredentialsSignin {
  code = "ACCOUNT_PENDING_ACTIVATION";
}
class AccountDeactivatedError extends CredentialsSignin {
  code = "ACCOUNT_DEACTIVATED";
}

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Credentials (email/password) is the only enabled provider today. The PrismaAdapter is wired
 * up so a Google (or other OAuth) provider can be dropped into the `providers` array later
 * without any schema or session changes — Account/Session/User already exist and follow the
 * standard Auth.js adapter shape. Credentials requires the "jwt" session strategy, so the
 * adapter here manages User/Account linking rather than server-side sessions; switch to
 * "database" sessions automatically becomes available once an OAuth provider is added.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // The Prisma adapter and next-auth currently ship slightly different @auth/core type
  // definitions in their respective dependency trees, which trips a structural type check
  // even though the runtime shapes are identical — cast at this single boundary rather than
  // widening types anywhere else.
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

        // Always run a bcrypt.compare, even for an unknown email or an account with no
        // password set — against a fixed dummy hash when there's no real one to check. This
        // keeps the response time (and thus the observable side channel) the same whether the
        // email exists or not, rather than returning early only for unknown accounts.
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

        if (!user || !user.passwordHash || !valid) return null;

        // Only reveal account-status details (pending/deactivated) to someone who has already
        // proven they know the correct password — revealing it to anyone who merely guesses a
        // real email address would let an attacker enumerate registered accounts and their
        // status without ever knowing a password.
        if (user.status !== "ACTIVE") {
          throw user.status === "PENDING" ? new AccountPendingActivationError() : new AccountDeactivatedError();
        }

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await prisma.activityLog.create({
          data: { action: "USER_LOGIN", actorId: user.id, description: `${user.email} logged in` },
        });

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "SALES_REP";
      }
      return session;
    },
  },
});
