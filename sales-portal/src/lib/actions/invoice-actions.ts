"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDocumentNumber, nextSequenceNumber } from "@/lib/numbering";
import { sendEmail } from "@/lib/email";
import { round2 } from "@/lib/pricing/engine";
import { generatePublicToken } from "@/lib/security/token";
import { computeDueDate } from "@/lib/invoiceTerms";

export interface InvoiceActionResult {
  ok: boolean;
  message?: string;
  invoiceId?: string;
  invoiceNumber?: string;
}

/**
 * Converts an approved quote into an invoice without re-entering anything: the quote's
 * customer, line items (with their original pricing snapshot), and adjustments are all
 * copied verbatim. The source quote is preserved unchanged (aside from its status flipping to
 * CONVERTED_TO_INVOICE) — nothing about the quote record itself is deleted or overwritten.
 */
export async function convertQuoteToInvoice(quoteId: string): Promise<InvoiceActionResult> {
  const user = await requireUser();
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lineItems: true, adjustments: true, invoice: true },
  });
  if (!quote) return { ok: false, message: "Quote not found." };
  if (user.role === "SALES_REP" && quote.ownerId !== user.id) return { ok: false, message: "Not authorized." };
  if (quote.invoice) return { ok: false, message: "This quote has already been converted to an invoice." };
  if (quote.status !== "APPROVED") {
    return { ok: false, message: "Only approved quotes can be converted to an invoice." };
  }

  const settings = await prisma.companySettings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });

  const result = await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const seq = await nextSequenceNumber(tx, "INVOICE", year);
    const invoiceNumber = formatDocumentNumber(settings.numberFormat, settings.invoicePrefix, year, seq);

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        publicToken: generatePublicToken(),
        quoteId: quote.id,
        customerId: quote.customerId,
        ownerId: quote.ownerId,
        priceListCode: quote.priceListCode,
        status: "DRAFT",
        dueDate: computeDueDate(quote.paymentTerms ?? settings.defaultPaymentTerms),
        paymentTerms: quote.paymentTerms ?? settings.defaultPaymentTerms,
        subtotal: quote.subtotal,
        discountTotal: quote.discountTotal,
        feeTotal: quote.feeTotal,
        shippingTotal: quote.shippingTotal,
        taxTotal: quote.taxTotal,
        grandTotal: quote.grandTotal,
        depositRequired: quote.depositRequired,
        amountPaid: 0,
        balanceDue: quote.grandTotal,
        achInstructions: settings.achInstructions,
        customerFacingNotes: quote.customerFacingNotes,
        internalNotes: quote.internalNotes,
        lineItems: {
          create: quote.lineItems.map((li) => ({
            productVariantId: li.productVariantId,
            sortOrder: li.sortOrder,
            productName: li.productName,
            sku: li.sku,
            strength: li.strength,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            lineTotal: li.lineTotal,
            pricingTierLabel: li.pricingTierLabel,
            priceListCode: li.priceListCode,
            priceListName: li.priceListName,
            effectiveDate: li.effectiveDate,
          })),
        },
        adjustments: {
          create: quote.adjustments.map((a) => ({
            type: a.type,
            label: a.label,
            valueType: a.valueType,
            value: a.value,
            amount: a.amount,
            requiresApproval: a.requiresApproval,
            approvedById: a.approvedById,
            approvedAt: a.approvedAt,
          })),
        },
      },
    });

    await tx.quote.update({ where: { id: quote.id }, data: { status: "CONVERTED_TO_INVOICE", convertedAt: new Date() } });
    await tx.activityLog.create({
      data: {
        action: "QUOTE_CONVERTED",
        actorId: user.id,
        customerId: quote.customerId,
        quoteId: quote.id,
        invoiceId: invoice.id,
        description: `${quote.quoteNumber} converted to ${invoiceNumber}`,
      },
    });
    await tx.activityLog.create({
      data: { action: "INVOICE_CREATED", actorId: user.id, customerId: quote.customerId, invoiceId: invoice.id, description: `${invoiceNumber} created from ${quote.quoteNumber}` },
    });

    return invoice;
  });

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/invoices");
  return { ok: true, invoiceId: result.id, invoiceNumber: result.invoiceNumber };
}

export async function sendInvoice(invoiceId: string, recipientEmail?: string): Promise<InvoiceActionResult> {
  const user = await requireUser();
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { customer: true } });
  if (!invoice) return { ok: false, message: "Invoice not found." };
  if (user.role === "SALES_REP" && invoice.ownerId !== user.id) return { ok: false, message: "Not authorized." };

  const email = recipientEmail || invoice.customer.email;
  let emailSent = false;
  if (email) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const result = await sendEmail({
      to: email,
      subject: `Invoice ${invoice.invoiceNumber} from LA Peptides`,
      html: `<p>Hello ${invoice.customer.contactName},</p><p>Invoice ${invoice.invoiceNumber} — total due ${Number(invoice.balanceDue).toLocaleString(
        "en-US",
        { style: "currency", currency: "USD" }
      )}.</p><p>View: ${baseUrl}/api/invoices/${invoice.id}/pdf</p>`,
    });
    emailSent = result.sent;
  }

  await prisma.$transaction([
    prisma.invoice.update({ where: { id: invoiceId }, data: { status: "SENT", sentAt: new Date(), sentToEmail: email || null } }),
    prisma.activityLog.create({
      data: { action: "INVOICE_SENT", actorId: user.id, customerId: invoice.customerId, invoiceId, description: emailSent ? `Sent to ${email}` : "Marked sent (email not delivered)" },
    }),
  ]);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true, message: emailSent ? "Invoice sent." : "Invoice marked sent, but email delivery is not configured." };
}

const paymentSchema = z.object({
  amount: z.number().positive("Enter a payment amount greater than zero."),
  method: z.enum(["ACH", "WIRE", "CREDIT_CARD", "CHECK", "CASH", "OTHER"]),
  referenceNote: z.string().optional(),
  internalNote: z.string().optional(),
});

export async function recordPayment(invoiceId: string, input: z.infer<typeof paymentSchema>): Promise<InvoiceActionResult> {
  const user = await requireUser();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid payment." };

  const existing = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { ownerId: true, customerId: true, invoiceNumber: true } });
  if (!existing) return { ok: false, message: "Invoice not found." };
  if (user.role === "SALES_REP" && existing.ownerId !== user.id) return { ok: false, message: "Not authorized." };

  // Reading amountPaid, computing the new total in JS, then writing it back is a lost-update
  // race: two payments recorded within the same moment (e.g. two staff members, or a double
  // click) can both read the pre-payment balance and each overwrite the other's update instead
  // of summing. `{ increment }` pushes the addition down into a single atomic SQL statement —
  // Postgres serializes concurrent updates to the same row via row-level locking, so the second
  // writer's increment always applies on top of the first writer's already-committed value.
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: { increment: parsed.data.amount } },
      });

      const newAmountPaid = round2(Number(updated.amountPaid));
      const grandTotal = Number(updated.grandTotal);
      if (newAmountPaid > grandTotal + 0.01) {
        // Throwing rolls back the increment along with everything else in this transaction.
        throw new Error(
          `OVERPAY:Payment of ${parsed.data.amount} would exceed the remaining balance of ${round2(grandTotal - (newAmountPaid - parsed.data.amount))}.`
        );
      }
      const newBalance = round2(grandTotal - newAmountPaid);
      const newStatus = newBalance <= 0.01 ? "PAID" : "PARTIALLY_PAID";

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { balanceDue: newBalance, status: newStatus, paidAt: newStatus === "PAID" ? new Date() : updated.paidAt },
      });

      await tx.payment.create({
        data: {
          invoiceId,
          amount: parsed.data.amount,
          method: parsed.data.method,
          referenceNote: parsed.data.referenceNote || null,
          internalNote: parsed.data.internalNote || null,
          recordedById: user.id,
        },
      });
      await tx.activityLog.create({
        data: { action: "PAYMENT_RECORDED", actorId: user.id, customerId: existing.customerId, invoiceId, description: `Payment of ${parsed.data.amount} recorded (${parsed.data.method})` },
      });
      if (newStatus === "PAID") {
        await tx.activityLog.create({
          data: { action: "INVOICE_MARKED_PAID", actorId: user.id, customerId: existing.customerId, invoiceId, description: `${existing.invoiceNumber} fully paid` },
        });
      }

    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not record payment.";
    if (message.startsWith("OVERPAY:")) return { ok: false, message: message.slice("OVERPAY:".length) };
    throw err;
  }

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true };
}

export async function cancelInvoice(invoiceId: string): Promise<InvoiceActionResult> {
  const user = await requireUser();
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { ok: false, message: "Invoice not found." };
  if (user.role === "SALES_REP" && invoice.ownerId !== user.id) return { ok: false, message: "Not authorized." };
  if (Number(invoice.amountPaid) > 0) return { ok: false, message: "Cannot cancel an invoice that has recorded payments — void or refund it instead." };

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "CANCELLED" } });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true };
}

export async function voidInvoice(invoiceId: string): Promise<InvoiceActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, message: "Only administrators can void invoices." };
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "VOIDED" } });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true };
}

export async function refundInvoice(invoiceId: string): Promise<InvoiceActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, message: "Only administrators can process refunds." };
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { ok: false, message: "Invoice not found." };
  if (!["PAID", "PARTIALLY_PAID"].includes(invoice.status)) {
    return { ok: false, message: "Only paid or partially paid invoices can be refunded." };
  }
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "REFUNDED" } });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { ok: true };
}
