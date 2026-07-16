"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const RESET_TOKEN_TTL_MINUTES = 30;

const requestSchema = z.object({ email: z.string().email() });

export async function requestPasswordReset(formData: FormData) {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return the same message whether or not the account exists, to avoid leaking which
  // emails are registered sales-rep accounts.
  const genericMessage = "If that email is registered, a reset link has been sent.";

  if (!user || user.status !== "ACTIVE") {
    return { ok: true, message: genericMessage };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const result = await sendEmail({
    to: user.email,
    subject: "Reset your LA Peptides Sales Portal password",
    html: `<p>Hello ${user.name},</p><p>Click below to reset your password. This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
  });

  if (!result.sent) {
    // Email isn't configured in this environment — surface the reset link directly so local
    // development and demo environments remain usable without a mail provider.
    return { ok: true, message: genericMessage, devResetUrl: resetUrl };
  }

  return { ok: true, message: genericMessage };
}

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function confirmPasswordReset(formData: FormData) {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid submission." };
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, message: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { ok: true, message: "Password updated. You can now log in." };
}
