"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDocumentNumber, nextSequenceNumber } from "@/lib/numbering";
import { sendEmail } from "@/lib/email";
import { round2 } from "@/lib/pricing/engine";

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
        quoteId: quote.id,
        customerId: quote.customerId,
        ownerId: quote.ownerId,
        priceListCode: quote.priceListCode,
        status: "DRAFT",
        dueDate: quote.paymentTerms === "Prepaid" || !quote.paymentTerms ? new Date() : null,
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

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { ok: false, message: "Invoice not found." };
  if (user.role === "SALES_REP" && invoice.ownerId !== user.id) return { ok: false, message: "Not authorized." };

  const newAmountPaid = round2(Number(invoice.amountPaid) + parsed.data.amount);
  const grandTotal = Number(invoice.grandTotal);
  if (newAmountPaid > grandTotal + 0.01) {
    return { ok: false, message: `Payment of ${parsed.data.amount} would exceed the remaining balance of ${round2(grandTotal - Number(invoice.amountPaid))}.` };
  }
  const newBalance = round2(grandTotal - newAmountPaid);
  const newStatus = newBalance <= 0.01 ? "PAID" : "PARTIALLY_PAID";

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId,
        amount: parsed.data.amount,
        method: parsed.data.method,
        referenceNote: parsed.data.referenceNote || null,
        internalNote: parsed.data.internalNote || null,
        recordedById: user.id,
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newAmountPaid, balanceDue: newBalance, status: newStatus, paidAt: newStatus === "PAID" ? new Date() : invoice.paidAt },
    }),
    prisma.activityLog.create({
      data: { action: "PAYMENT_RECORDED", actorId: user.id, customerId: invoice.customerId, invoiceId, description: `Payment of ${parsed.data.amount} recorded (${parsed.data.method})` },
    }),
    ...(newStatus === "PAID"
      ? [
          prisma.activityLog.create({
            data: { action: "INVOICE_MARKED_PAID", actorId: user.id, customerId: invoice.customerId, invoiceId, description: `${invoice.invoiceNumber} fully paid` },
          }),
        ]
      : []),
  ]);

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
