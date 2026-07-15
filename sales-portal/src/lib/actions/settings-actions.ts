"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const settingsSchema = z.object({
  companyName: z.string().min(1),
  dbaName: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  website: z.string().optional(),
  quotePrefix: z.string().min(1).max(10),
  invoicePrefix: z.string().min(1).max(10),
  defaultQuoteExpirationDays: z.number().int().min(1).max(365),
  defaultPaymentTerms: z.string(),
  allowNetTerms: z.boolean(),
  achInstructions: z.string().optional(),
  defaultQuoteNotes: z.string().optional(),
  defaultTermsAndConditions: z.string().optional(),
  pdfFooterText: z.string().optional(),
  customerApprovalLanguage: z.string().optional(),
  taxBehavior: z.enum(["EXCLUSIVE", "INCLUSIVE", "EXEMPT_BY_DEFAULT"]),
  defaultTaxRatePercent: z.number().min(0).max(100),
  repDiscountLimitPercent: z.number().min(0).max(100),
});

export interface SettingsActionResult {
  ok: boolean;
  message?: string;
}

export async function updateCompanySettings(input: z.infer<typeof settingsSchema>): Promise<SettingsActionResult> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid settings." };

  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: parsed.data,
  });

  await prisma.activityLog.create({
    data: { action: "ADMIN_PRICING_UPDATE", actorId: admin.id, description: "Company settings updated" },
  });

  revalidatePath("/settings");
  return { ok: true };
}
