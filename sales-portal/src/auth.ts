import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
        if (!user || !user.passwordHash) return null;

        if (user.status !== "ACTIVE") {
          // Distinguish "wrong password" from "not yet activated" for the login page's error copy.
          throw new Error(
            user.status === "PENDING"
              ? "ACCOUNT_PENDING_ACTIVATION"
              : "ACCOUNT_DEACTIVATED"
          );
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

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
