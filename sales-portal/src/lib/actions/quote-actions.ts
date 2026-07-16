"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { quoteDraftSchema, type QuoteDraftInput } from "@/lib/validation/quote";
import { resolveLineItemPricing, resolveSampleLine } from "@/lib/pricing/resolve";
import { calculateQuoteTotals, authorizeDiscount, type AdjustmentInput } from "@/lib/pricing/engine";
import { formatDocumentNumber, nextSequenceNumber } from "@/lib/numbering";
import { sendEmail } from "@/lib/email";
import { generatePublicToken } from "@/lib/security/token";
import { submitQuoteApproval } from "@/lib/actions/public-quote-actions";

export interface SaveQuoteResult {
  ok: boolean;
  message?: string;
  quoteId?: string;
  quoteNumber?: string;
  lineWarnings?: Array<{ variantId: string; sku: string; warning: string }>;
  blockingApprovals?: Array<{ label: string; reason: string }>;
}

async function getCompanySettings() {
  return prisma.companySettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

export async function saveQuoteDraft(rawInput: QuoteDraftInput): Promise<SaveQuoteResult> {
  const user = await requireUser();
  const parsed = quoteDraftSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid quote data." };
  }
  const input = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) return { ok: false, message: "Customer not found." };
  if (user.role === "SALES_REP" && customer.assignedRepId !== user.id) {
    return { ok: false, message: "You do not have access to this customer." };
  }

  if (input.quoteId) {
    const existing = await prisma.quote.findUnique({ where: { id: input.quoteId } });
    if (!existing) return { ok: false, message: "Quote not found." };
    if (existing.status !== "DRAFT") {
      return { ok: false, message: "Only draft quotes can be edited. Duplicate this quote to make changes." };
    }
    if (user.role === "SALES_REP" && existing.ownerId !== user.id) {
      return { ok: false, message: "You do not have access to this quote." };
    }
  }

  // Resolve every line server-side — the client never gets to dictate a unit price.
  // calculateLineItemPricing() throws rather than inventing a price when the selected tier
  // qualifies but has no PriceListEntry for this variant (a real, reachable state: the
  // client's cart preview is built from whichever tiers a variant already has prices for, so a
  // newly-added SKU that's only priced for some tiers can look fine in the wizard right up
  // until the server tries to resolve a tier it has no price for). Catch it here and surface a
  // normal error instead of letting the whole action reject with an unhandled exception.
  let resolvedLines;
  try {
    // Mix-and-match pooling (confirmed business rule): every PAID unit on the quote counts
    // toward tier qualification for every line, across categories. Sample lines are free
    // product (JJ 7/16) and never help a paid line reach a deeper tier.
    const pooledQuantity = input.lineItems.reduce(
      (sum, li) => (li.isSample ? sum : sum + li.quantity),
      0
    );
    resolvedLines = await Promise.all(
      input.lineItems.map((li) =>
        li.isSample
          ? resolveSampleLine(li.variantId, li.quantity)
          : resolveLineItemPricing(li.variantId, li.quantity, input.priceListCode, pooledQuantity)
      )
    );
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Could not price one or more lines: ${err.message}`
          : "Could not price one or more lines. Contact an administrator.",
    };
  }

  const lineWarnings: SaveQuoteResult["lineWarnings"] = [];
  const validLineTotals: number[] = [];
  const lineCreateData: Array<Record<string, unknown>> = [];

  for (let i = 0; i < resolvedLines.length; i++) {
    const line = resolvedLines[i];
    const requested = input.lineItems[i]!;
    if (!line) {
      return { ok: false, message: "One or more products could not be priced — they may be inactive." };
    }
    const isSampleLine = "isSampleLine" in line && line.isSampleLine === true;
    if (!line.qualifies) {
      lineWarnings.push({ variantId: line.variantId, sku: line.sku, warning: line.warning ?? "Below minimum." });
    } else if (!isSampleLine) {
      validLineTotals.push(line.lineTotal!);
    }
    lineCreateData.push({
      productVariantId: line.variantId,
      productName: line.productName,
      sku: line.sku,
      strength: line.strength,
      quantity: requested.quantity,
      unitPrice: line.unitPrice ?? 0,
      lineTotal: line.lineTotal ?? 0,
      // "Sample" is the tracking marker for free samples (no schema column needed).
      pricingTierLabel: isSampleLine
        ? "Sample"
        : line.appliedTier?.label ?? "Below minimum - not priced",
      priceListCode: line.effectivePriceListCode,
      priceListName: line.priceListName,
      effectiveDate: line.effectiveDate,
      minimumMet: line.qualifies,
      minimumRequired: line.minimumRequired,
    });
  }

  const settings = await getCompanySettings();
  const repLimit = Number(user.role === "ADMIN" ? 100 : (await prisma.user.findUnique({ where: { id: user.id } }))?.discountLimitPercent ?? settings.repDiscountLimitPercent);

  const subtotalForAuth = validLineTotals.reduce((s, v) => s + v, 0);
  const blockingApprovals: SaveQuoteResult["blockingApprovals"] = [];
  const adjustmentsResolved: Array<AdjustmentInput & { requiresApproval: boolean }> = input.adjustments.map((a) => {
    const auth = authorizeDiscount(a, subtotalForAuth, repLimit);
    if (!auth.authorized && user.role !== "ADMIN") {
      blockingApprovals.push({ label: a.label, reason: auth.reason ?? "Requires approval." });
    }
    return { ...a, requiresApproval: !auth.authorized };
  });

  const totals = calculateQuoteTotals({
    lineTotals: validLineTotals,
    adjustments: adjustmentsResolved,
    depositPercent: input.depositPercent ?? undefined,
  });

  const quote = await prisma.$transaction(async (tx) => {
    let quoteId = input.quoteId;
    let quoteNumber: string;

    if (!quoteId) {
      const year = new Date().getFullYear();
      const seq = await nextSequenceNumber(tx, "QUOTE", year);
      quoteNumber = formatDocumentNumber(settings.numberFormat, settings.quotePrefix, year, seq);
      const created = await tx.quote.create({
        data: {
          quoteNumber,
          publicToken: generatePublicToken(),
          customerId: input.customerId,
          ownerId: user.id,
          priceListCode: input.priceListCode,
          status: "DRAFT",
          expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
          paymentTerms: input.paymentTerms,
          customerFacingNotes: input.customerFacingNotes || null,
          internalNotes: input.internalNotes || null,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          feeTotal: totals.feeTotal,
          shippingTotal: totals.shippingTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          depositRequired: totals.depositAmount,
        },
      });
      quoteId = created.id;
      await tx.activityLog.create({
        data: { action: "QUOTE_CREATED", actorId: user.id, customerId: input.customerId, quoteId, description: `${quoteNumber} created` },
      });
    } else {
      const updated = await tx.quote.update({
        where: { id: quoteId },
        data: {
          customerId: input.customerId,
          priceListCode: input.priceListCode,
          expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
          paymentTerms: input.paymentTerms,
          customerFacingNotes: input.customerFacingNotes || null,
          internalNotes: input.internalNotes || null,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          feeTotal: totals.feeTotal,
          shippingTotal: totals.shippingTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          depositRequired: totals.depositAmount,
        },
      });
      quoteNumber = updated.quoteNumber;
      await tx.quoteLineItem.deleteMany({ where: { quoteId } });
      await tx.adjustment.deleteMany({ where: { quoteId } });
      await tx.activityLog.create({
        data: { action: "QUOTE_EDITED", actorId: user.id, customerId: input.customerId, quoteId, description: `${quoteNumber} edited` },
      });
    }

    await tx.quoteLineItem.createMany({
      data: lineCreateData.map((d) => ({ ...d, quoteId } as never)),
    });
    if (adjustmentsResolved.length > 0) {
      await tx.adjustment.createMany({
        data: adjustmentsResolved.map((a) => {
          const amount = totals.resolvedAdjustments.find((r) => r.label === a.label && r.kind === a.kind)?.amount ?? 0;
          return {
            quoteId,
            type: a.kind,
            label: a.label,
            valueType: a.valueType,
            value: a.value,
            amount,
            requiresApproval: a.requiresApproval,
            approvedById: user.role === "ADMIN" ? user.id : null,
            approvedAt: user.role === "ADMIN" ? new Date() : null,
          } as never;
        }),
      });
    }

    return { id: quoteId, quoteNumber };
  });

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quote.id}`);

  return {
    ok: true,
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    lineWarnings,
    blockingApprovals,
  };
}

export async function finalizeAndSendQuote(quoteId: string, recipientEmail?: string): Promise<SaveQuoteResult> {
  const user = await requireUser();
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lineItems: true, adjustments: true, customer: true },
  });
  if (!quote) return { ok: false, message: "Quote not found." };
  if (user.role === "SALES_REP" && quote.ownerId !== user.id) {
    return { ok: false, message: "You do not have access to this quote." };
  }
  if (quote.lineItems.length === 0) return { ok: false, message: "Add at least one product before sending." };

  // Order minimum (JJ 7/16/2026): quotes can be drafted at any size, but nothing under
  // 20 total units (samples excluded) may be sent or converted to an order.
  const billableUnits = quote.lineItems.reduce(
    (sum, li) => (li.pricingTierLabel === "Sample" ? sum : sum + li.quantity),
    0
  );
  if (billableUnits < 20) {
    return {
      ok: false,
      message: `Order minimum is 20 units (this quote has ${billableUnits}, samples excluded). Add ${20 - billableUnits} more unit(s) before sending.`,
    };
  }

  const invalidLines = quote.lineItems.filter((li) => !li.minimumMet);
  if (invalidLines.length > 0) {
    return {
      ok: false,
      message: "One or more line items do not meet the minimum quantity for this price list. Fix them before sending.",
      lineWarnings: invalidLines.map((li) => ({ variantId: li.productVariantId ?? "", sku: li.sku, warning: `Requires ${li.minimumRequired}+ units.` })),
    };
  }

  const unapproved = quote.adjustments.filter((a) => a.requiresApproval && !a.approvedById);
  if (unapproved.length > 0 && user.role !== "ADMIN") {
    return {
      ok: false,
      message: "This quote has discounts that exceed your limit and require administrator approval before it can be sent.",
      blockingApprovals: unapproved.map((a) => ({ label: a.label, reason: "Exceeds representative discount limit." })),
    };
  }

  const email = recipientEmail || quote.customer.email;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const approvalUrl = `${baseUrl}/q/${quote.publicToken}`;

  let emailSent = false;
  if (email) {
    const result = await sendEmail({
      to: email,
      subject: `Quote ${quote.quoteNumber} from LA Peptides`,
      html: `<p>Hello ${quote.customer.contactName},</p><p>Your quote ${quote.quoteNumber} is ready for review.</p><p><a href="${approvalUrl}">${approvalUrl}</a></p>`,
    });
    emailSent = result.sent;
  }

  await prisma.$transaction([
    prisma.quote.update({
      where: { id: quoteId },
      data: { status: "SENT", sentAt: new Date(), sentToEmail: email || null },
    }),
    prisma.activityLog.create({
      data: {
        action: "QUOTE_SENT",
        actorId: user.id,
        customerId: quote.customerId,
        quoteId,
        description: emailSent ? `Sent to ${email}` : "Marked sent (email not delivered — share link manually)",
      },
    }),
  ]);

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");

  return { ok: true, quoteId, quoteNumber: quote.quoteNumber, message: emailSent ? "Quote sent." : "Quote marked sent, but email delivery is not configured — share the link manually." };
}

/**
 * Order Mode "Create order": an order is a quote accepted on the spot (the existing model -
 * APPROVED quotes with no invoice are what the demand rails and reports count as orders).
 * Applies the SAME gates as finalizeAndSendQuote (minimums met, no unapproved over-limit
 * discounts for reps), then chains the existing public acceptance step so the status flip,
 * ApprovalRecord, and activity log stay on the one code path that already does acceptance.
 */
export async function acceptQuoteAsOrder(quoteId: string): Promise<SaveQuoteResult> {
  const user = await requireUser();
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lineItems: true, adjustments: true },
  });
  if (!quote) return { ok: false, message: "Quote not found." };
  if (user.role === "SALES_REP" && quote.ownerId !== user.id) {
    return { ok: false, message: "You do not have access to this quote." };
  }
  if (quote.lineItems.length === 0) return { ok: false, message: "Add at least one product before creating an order." };

  // Order minimum (JJ 7/16/2026): quotes can be drafted at any size, but nothing under
  // 20 total units (samples excluded) may be sent or converted to an order.
  const billableUnits = quote.lineItems.reduce(
    (sum, li) => (li.pricingTierLabel === "Sample" ? sum : sum + li.quantity),
    0
  );
  if (billableUnits < 20) {
    return {
      ok: false,
      message: `Order minimum is 20 units (this quote has ${billableUnits}, samples excluded). Add ${20 - billableUnits} more unit(s) before creating the order.`,
    };
  }

  const invalidLines = quote.lineItems.filter((li) => !li.minimumMet);
  if (invalidLines.length > 0) {
    return {
      ok: false,
      message: "One or more line items do not meet the minimum quantity for this price list. Fix them before creating an order.",
      lineWarnings: invalidLines.map((li) => ({ variantId: li.productVariantId ?? "", sku: li.sku, warning: `Requires ${li.minimumRequired}+ units.` })),
    };
  }

  const unapproved = quote.adjustments.filter((a) => a.requiresApproval && !a.approvedById);
  if (unapproved.length > 0 && user.role !== "ADMIN") {
    return {
      ok: false,
      quoteId,
      quoteNumber: quote.quoteNumber,
      message: "Saved as a draft quote. Its discounts exceed your limit and need administrator approval before it can become an order.",
      blockingApprovals: unapproved.map((a) => ({ label: a.label, reason: "Exceeds representative discount limit." })),
    };
  }

  const accepted = await submitQuoteApproval({
    token: quote.publicToken,
    decision: "APPROVED",
    respondentName: user.name ?? "Sales representative",
    respondentTitle: "Recorded by sales representative",
    comments: "Order taken in person via Order Mode.",
    billingConfirmed: false,
    shippingConfirmed: false,
    termsAccepted: true,
  });
  if (!accepted.ok) return { ok: false, message: accepted.message ?? "Could not accept this quote." };

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true, quoteId, quoteNumber: quote.quoteNumber };
}

export async function duplicateQuote(quoteId: string): Promise<SaveQuoteResult> {
  const user = await requireUser();
  const original = await prisma.quote.findUnique({ where: { id: quoteId }, include: { lineItems: true, adjustments: true } });
  if (!original) return { ok: false, message: "Quote not found." };
  if (user.role === "SALES_REP" && original.ownerId !== user.id) {
    return { ok: false, message: "You do not have access to this quote." };
  }

  return saveQuoteDraft({
    quoteId: null,
    customerId: original.customerId,
    priceListCode: original.priceListCode === "BULK_WHOLESALE" ? "BULK_WHOLESALE" : "BULK_RETAIL",
    lineItems: original.lineItems
      .filter((li) => li.productVariantId)
      .map((li) => ({ variantId: li.productVariantId as string, quantity: li.quantity })),
    adjustments: original.adjustments.map((a) => ({
      kind: a.type,
      label: a.label,
      valueType: a.valueType,
      value: Number(a.value),
    })),
    depositPercent: original.depositRequired && original.grandTotal ? Math.round((Number(original.depositRequired) / Number(original.grandTotal)) * 100) : null,
    expirationDate: null,
    paymentTerms: original.paymentTerms ?? "Prepaid",
    customerFacingNotes: original.customerFacingNotes ?? undefined,
    internalNotes: original.internalNotes ?? undefined,
  });
}

export async function cancelQuote(quoteId: string): Promise<SaveQuoteResult> {
  const user = await requireUser();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return { ok: false, message: "Quote not found." };
  if (user.role === "SALES_REP" && quote.ownerId !== user.id) return { ok: false, message: "Not authorized." };
  if (quote.status === "CONVERTED_TO_INVOICE") return { ok: false, message: "This quote has already been converted to an invoice." };

  await prisma.$transaction([
    prisma.quote.update({ where: { id: quoteId }, data: { status: "CANCELLED", cancelledAt: new Date() } }),
    prisma.activityLog.create({ data: { action: "QUOTE_CANCELLED", actorId: user.id, quoteId, customerId: quote.customerId } }),
  ]);
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true, quoteId };
}

export async function deleteDraftQuote(quoteId: string): Promise<SaveQuoteResult> {
  const user = await requireUser();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return { ok: false, message: "Quote not found." };
  if (user.role === "SALES_REP" && quote.ownerId !== user.id) return { ok: false, message: "Not authorized." };
  if (quote.status !== "DRAFT") return { ok: false, message: "Only draft quotes can be deleted." };

  await prisma.quote.delete({ where: { id: quoteId } });
  revalidatePath("/quotes");
  return { ok: true };
}

export async function approveAdjustment(adjustmentId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, message: "Only administrators can approve discounts." };
  const adjustment = await prisma.adjustment.update({
    where: { id: adjustmentId },
    data: { approvedById: user.id, approvedAt: new Date() },
  });
  if (adjustment.quoteId) revalidatePath(`/quotes/${adjustment.quoteId}`);
  if (adjustment.invoiceId) revalidatePath(`/invoices/${adjustment.invoiceId}`);
  return { ok: true };
}
