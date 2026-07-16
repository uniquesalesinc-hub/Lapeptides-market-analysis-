"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/clientSession";
import { placeClientOrderSchema } from "@/lib/validation/clientOrder";
import { resolveLineItemPricing } from "@/lib/pricing/resolve";
import { calculateQuoteTotals } from "@/lib/pricing/engine";
import { formatDocumentNumber, nextSequenceNumber } from "@/lib/numbering";
import { generatePublicToken } from "@/lib/security/token";
import { sendEmail } from "@/lib/email";
import { resolveInjectableLadder } from "@/lib/data/storeCatalog";
import {
  CLIENT_ORDER_MINIMUM_UNITS,
  buildClientOrderInternalNotes,
  clientOrderMinimumShortfall,
} from "@/lib/clientOrder";

/**
 * Client checkout: turns the server-side ClientCart into a Quote with origin CLIENT and
 * status SENT, sitting in the exact same rep/admin approval pipeline rep-sent quotes use.
 * Mirrors saveQuoteDraft's money path deliberately: every line is re-resolved server-side
 * through resolveLineItemPricing on the customer's ASSIGNED ladder with pooled tier
 * qualification (capsules exempt, inside the resolver), totals come from
 * calculateQuoteTotals, numbering from the shared sequence, and the public token from the
 * same generator - the client's browser never contributes a price, a ladder, or a number.
 *
 * Two hard gates, both enforced HERE regardless of what the UI showed:
 * - 20-unit order minimum (same rule finalizeAndSendQuote/acceptQuoteAsOrder enforce).
 * - A literal-true RUO acknowledgment, persisted as Quote.ruoAcknowledgedAt.
 */

export interface PlaceClientOrderResult {
  ok: boolean;
  message?: string;
  quoteId?: string;
  quoteNumber?: string;
}

export async function placeClientOrder(rawInput: unknown): Promise<PlaceClientOrderResult> {
  const session = await requireClient();

  const parsed = placeClientOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid order details." };
  }
  const input = parsed.data;

  const [cart, customer] = await Promise.all([
    prisma.clientCart.findUnique({
      where: { portalUserId: session.id },
      include: {
        items: {
          include: { productVariant: { include: { product: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.customer.findUnique({ where: { id: session.customerId } }),
  ]);

  if (!customer) return { ok: false, message: "Your account could not be loaded. Contact the LA Peptides team." };
  if (!cart || cart.items.length === 0) return { ok: false, message: "Your cart is empty." };

  const totalUnits = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const shortfall = clientOrderMinimumShortfall(totalUnits);
  if (shortfall > 0) {
    return {
      ok: false,
      message: `Order minimum is ${CLIENT_ORDER_MINIMUM_UNITS} units (this cart has ${totalUnits}). Add ${shortfall} more unit(s) before placing your order.`,
    };
  }

  // Re-resolve EVERY line server-side on the customer's assigned ladder with the pooled
  // quantity. Reject the whole order if any line fails to qualify or to price - a client
  // order must never enter the queue with an unpriced or below-minimum line.
  const ladder = resolveInjectableLadder(customer.defaultPriceListCode);
  let resolvedLines;
  try {
    resolvedLines = await Promise.all(
      cart.items.map((item) => resolveLineItemPricing(item.productVariantId, item.quantity, ladder, totalUnits))
    );
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Could not price one or more items: ${err.message}`
          : "Could not price one or more items. Contact the LA Peptides team.",
    };
  }

  const lineCreateData: Array<Record<string, unknown>> = [];
  const lineTotals: number[] = [];
  for (let i = 0; i < resolvedLines.length; i++) {
    const line = resolvedLines[i];
    if (!line) {
      return { ok: false, message: "One or more products in your cart are no longer available. Remove them and try again." };
    }
    if (!line.qualifies) {
      return {
        ok: false,
        message: `${line.productName} (${line.sku}) does not qualify for pricing: ${line.warning ?? "below minimum."} Adjust your cart and try again.`,
      };
    }
    lineTotals.push(line.lineTotal!);
    lineCreateData.push({
      productVariantId: line.variantId,
      sortOrder: i,
      productName: line.productName,
      sku: line.sku,
      strength: line.strength,
      quantity: line.quantity,
      unitPrice: line.unitPrice ?? 0,
      lineTotal: line.lineTotal ?? 0,
      pricingTierLabel: line.appliedTier?.label ?? "Below minimum - not priced",
      priceListCode: line.effectivePriceListCode,
      priceListName: line.priceListName,
      effectiveDate: line.effectiveDate,
      minimumMet: line.qualifies,
      minimumRequired: line.minimumRequired,
    });
  }

  // No adjustments on a client order: no self-serve discounts, fees, or shipping - the
  // reviewing rep adds anything like that during approval.
  const totals = calculateQuoteTotals({ lineTotals, adjustments: [] });

  // Owner: the customer's assigned rep, so rep scoping (listQuotes, dashboards, reports)
  // keeps working untouched. Fall back to an ADMIN only if the rep row is somehow gone.
  const assignedRep = await prisma.user.findUnique({
    where: { id: customer.assignedRepId },
    select: { id: true, name: true, email: true },
  });
  const owner =
    assignedRep ??
    (await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true },
    }));
  if (!owner) return { ok: false, message: "No account manager is available to receive this order. Contact the LA Peptides team." };

  const settings = await prisma.companySettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

  const internalNotes = buildClientOrderInternalNotes(
    { name: session.name, email: session.email },
    cart.items.map((item) => ({ sku: item.productVariant.sku, note: item.note }))
  );

  const now = new Date();
  const shippingAddress = input.shippingAddress;
  const billingAddress = input.billingAddress?.trim() ? input.billingAddress.trim() : null;

  let quote: { id: string; quoteNumber: string };
  try {
    quote = await prisma.$transaction(async (tx) => {
      const year = now.getFullYear();
      const seq = await nextSequenceNumber(tx, "QUOTE", year);
      const quoteNumber = formatDocumentNumber(settings.numberFormat, settings.quotePrefix, year, seq);

      const created = await tx.quote.create({
        data: {
          quoteNumber,
          publicToken: generatePublicToken(),
          customerId: customer.id,
          ownerId: owner.id,
          priceListCode: ladder,
          origin: "CLIENT",
          ruoAcknowledgedAt: now,
          status: "SENT",
          sentAt: now,
          paymentTerms: customer.paymentTerms,
          internalNotes,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          feeTotal: totals.feeTotal,
          shippingTotal: totals.shippingTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          depositRequired: totals.depositAmount,
        },
      });

      await tx.quoteLineItem.createMany({
        data: lineCreateData.map((d) => ({ ...d, quoteId: created.id } as never)),
      });

      // Save the checkout addresses back onto the customer (freeform v2 CRM strings).
      await tx.customer.update({
        where: { id: customer.id },
        data: { shippingAddress, billingAddress },
      });

      // ActivityAction is a closed enum without a client-order value, so this logs as
      // QUOTE_CREATED (the nearest existing action); the description carries the real story
      // and internalNotes carries the "Client portal order" marker. actorId stays null -
      // the actor is a PortalUser, not a staff User.
      await tx.activityLog.create({
        data: {
          action: "QUOTE_CREATED",
          actorId: null,
          customerId: customer.id,
          quoteId: created.id,
          description: `${quoteNumber} placed via client portal by ${session.name} (${session.email})`,
        },
      });

      // Clear the cart in the SAME transaction: an order and its source cart can never
      // both survive. The cart row itself stays (one cart per portal user), emptied.
      await tx.clientCartItem.deleteMany({ where: { cartId: cart.id } });

      return { id: created.id, quoteNumber };
    });
  } catch (err) {
    console.error("[client-order:place-failed]", err);
    return { ok: false, message: "Could not place your order. Please try again." };
  }

  // Notify the owning rep. Honest fire-and-forget: sendEmail returns sent:false without a
  // configured key, and either way the order is already safely in the queue.
  if (owner.email) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    await sendEmail({
      to: owner.email,
      subject: `New client order ${quote.quoteNumber} from ${customer.businessName}`,
      html: `<p>Hello ${owner.name},</p><p>${session.name} at ${customer.businessName} placed order ${quote.quoteNumber} through the client portal. It is waiting for your review.</p><p><a href="${baseUrl}/quotes/${quote.id}">${baseUrl}/quotes/${quote.id}</a></p>`,
    }).catch((err) => console.error("[client-order:notify-failed]", err));
  }

  revalidatePath("/quotes");
  revalidatePath("/store/cart");
  revalidatePath("/store/account");

  return { ok: true, quoteId: quote.id, quoteNumber: quote.quoteNumber };
}

/**
 * Reorder: rebuild the client's cart from a past CLIENT-origin order of THEIR OWN customer.
 * Replaces the current cart contents (quantities aggregated per variant, inactive products
 * skipped); pricing is not copied - the cart reprices live on today's lists, as always.
 */
export async function reorderClientQuote(quoteId: string): Promise<PlaceClientOrderResult & { cartUnits?: number }> {
  const session = await requireClient();

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, customerId: session.customerId, origin: "CLIENT" },
    select: {
      id: true,
      quoteNumber: true,
      lineItems: {
        select: {
          quantity: true,
          productVariantId: true,
          productVariant: { select: { id: true, isActive: true, product: { select: { isActive: true } } } },
        },
      },
    },
  });
  if (!quote) return { ok: false, message: "Order not found." };

  const usable = quote.lineItems.filter(
    (li) => li.productVariant && li.productVariant.isActive && li.productVariant.product.isActive
  );
  if (usable.length === 0) {
    return { ok: false, message: "None of the products on this order are available right now." };
  }

  // Aggregate per variant to satisfy the cart's one-row-per-variant constraint.
  const quantities = new Map<string, number>();
  for (const li of usable) {
    const id = li.productVariantId!;
    quantities.set(id, (quantities.get(id) ?? 0) + li.quantity);
  }

  try {
    const cartUnits = await prisma.$transaction(async (tx) => {
      const cart = await tx.clientCart.upsert({
        where: { portalUserId: session.id },
        create: { portalUserId: session.id, customerId: session.customerId },
        update: {},
        select: { id: true },
      });
      await tx.clientCartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.clientCartItem.createMany({
        data: Array.from(quantities, ([productVariantId, quantity]) => ({
          cartId: cart.id,
          productVariantId,
          quantity,
        })),
      });
      return Array.from(quantities.values()).reduce((sum, q) => sum + q, 0);
    });

    revalidatePath("/store/cart");
    return { ok: true, quoteId: quote.id, quoteNumber: quote.quoteNumber, cartUnits };
  } catch (err) {
    console.error("[client-order:reorder-failed]", err);
    return { ok: false, message: "Could not rebuild your cart. Please try again." };
  }
}
