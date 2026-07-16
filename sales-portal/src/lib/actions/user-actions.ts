"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";

const createRepSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Enter a valid email address."),
  discountLimitPercent: z.number().min(0).max(100),
});

export interface UserActionResult {
  ok: boolean;
  message?: string;
  temporaryPassword?: string;
}

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function createSalesRep(input: z.infer<typeof createRepSchema>): Promise<UserActionResult> {
  const admin = await requireAdmin();
  const parsed = createRepSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() } });
  if (existing) return { ok: false, message: "A user with this email already exists." };

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase().trim(),
      name: parsed.data.name,
      role: "SALES_REP",
      status: "ACTIVE",
      passwordHash,
      discountLimitPercent: parsed.data.discountLimitPercent,
    },
  });

  await prisma.activityLog.create({
    data: { action: "ADMIN_PRICING_UPDATE", actorId: admin.id, description: `Sales rep ${user.email} created by ${admin.name}` },
  });

  revalidatePath("/reps");
  return { ok: true, temporaryPassword: tempPassword };
}

export async function setUserStatus(userId: string, status: "ACTIVE" | "DEACTIVATED"): Promise<UserActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, message: "You cannot change your own account status." };
  await prisma.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/reps");
  return { ok: true };
}

export async function updateDiscountLimit(userId: string, discountLimitPercent: number): Promise<UserActionResult> {
  await requireAdmin();
  if (discountLimitPercent < 0 || discountLimitPercent > 100) return { ok: false, message: "Enter a value between 0 and 100." };
  await prisma.user.update({ where: { id: userId }, data: { discountLimitPercent } });
  revalidatePath("/reps");
  return { ok: true };
}

const profileSchema = z.object({ name: z.string().min(2), phone: z.string().optional() });

export async function updateOwnProfile(input: z.infer<typeof profileSchema>): Promise<UserActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone || null } });
  revalidatePath("/account");
  return { ok: true };
}

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export async function changeOwnPassword(input: z.infer<typeof passwordChangeSchema>): Promise<UserActionResult> {
  const sessionUser = await requireUser();
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user?.passwordHash) return { ok: false, message: "Account not found." };
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { ok: false, message: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true };
}
