"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const approvalSchema = z.object({
  token: z.string().min(1),
  decision: z.enum(["APPROVED", "DECLINED"]),
  respondentName: z.string().min(2, "Enter your name."),
  respondentTitle: z.string().optional(),
  comments: z.string().optional(),
  billingConfirmed: z.boolean(),
  shippingConfirmed: z.boolean(),
  termsAccepted: z.boolean(),
});

export interface PublicApprovalResult {
  ok: boolean;
  message?: string;
}

export async function submitQuoteApproval(input: z.infer<typeof approvalSchema>): Promise<PublicApprovalResult> {
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid submission." };
  }
  const data = parsed.data;

  if (data.decision === "APPROVED" && !data.termsAccepted) {
    return { ok: false, message: "You must accept the terms to approve this quote." };
  }

  const quote = await prisma.quote.findUnique({ where: { publicToken: data.token } });
  if (!quote) return { ok: false, message: "Quote not found." };
  if (quote.status === "APPROVED" || quote.status === "DECLINED") {
    return { ok: false, message: "This quote has already received a response." };
  }
  if (quote.status === "EXPIRED" || (quote.expirationDate && quote.expirationDate < new Date())) {
    return { ok: false, message: "This quote has expired. Contact your sales representative for a new quote." };
  }
  if (quote.status === "CANCELLED" || quote.status === "CONVERTED_TO_INVOICE") {
    return { ok: false, message: "This quote is no longer awaiting a response." };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || null;
  const userAgent = headerList.get("user-agent");

  await prisma.$transaction([
    prisma.approvalRecord.create({
      data: {
        quoteId: quote.id,
        decision: data.decision,
        respondentName: data.respondentName,
        respondentTitle: data.respondentTitle || null,
        comments: data.comments || null,
        billingConfirmed: data.billingConfirmed,
        shippingConfirmed: data.shippingConfirmed,
        termsAccepted: data.termsAccepted,
        ipAddress,
        userAgent,
      },
    }),
    prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: data.decision,
        approvedAt: data.decision === "APPROVED" ? new Date() : undefined,
        declinedAt: data.decision === "DECLINED" ? new Date() : undefined,
      },
    }),
    prisma.activityLog.create({
      data: {
        action: data.decision === "APPROVED" ? "QUOTE_APPROVED" : "QUOTE_DECLINED",
        customerId: quote.customerId,
        quoteId: quote.id,
        description: `${data.decision === "APPROVED" ? "Approved" : "Declined"} by ${data.respondentName}`,
      },
    }),
  ]);

  return { ok: true };
}
