import type { QuoteStatus } from "@prisma/client";

/**
 * Shared client-order rules and copy. These are the SAME business gates the rep surface
 * enforces in finalizeAndSendQuote/acceptQuoteAsOrder (20-unit minimum, samples excluded) -
 * client carts have no samples concept, so every cart unit is a billable unit here. Pure
 * module so the cart page, checkout page, and placeClientOrder all pull one source of truth.
 */

export const CLIENT_ORDER_MINIMUM_UNITS = 20;

/**
 * The exact acknowledgment copy required at client checkout (PRODUCT.md: client checkout
 * requires a recorded RUO acknowledgment). Rendered verbatim next to the required checkbox
 * and never paraphrased.
 */
export const CLIENT_RUO_ACKNOWLEDGMENT =
  "I acknowledge these products are for research purposes only and not for human consumption.";

/** Units still needed to reach the order minimum; 0 when the cart qualifies. */
export function clientOrderMinimumShortfall(totalUnits: number): number {
  return Math.max(0, CLIENT_ORDER_MINIMUM_UNITS - totalUnits);
}

/**
 * Client-facing status labels for CLIENT-origin quotes. A client order enters the pipeline
 * as a SENT quote awaiting rep/admin review, so the buyer sees "Received - pending review",
 * not internal quote vocabulary.
 */
export function clientOrderStatusLabel(status: QuoteStatus): string {
  switch (status) {
    case "SENT":
    case "VIEWED":
      return "Received - pending review";
    case "AWAITING_APPROVAL":
      return "Pending review";
    case "APPROVED":
      return "Confirmed";
    case "DECLINED":
      return "Declined";
    case "EXPIRED":
      return "Expired";
    case "CONVERTED_TO_INVOICE":
      return "Invoiced";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Received - pending review";
  }
}

/** Chip tone per client-facing status - mirrors the StatusBadge tone rules (DESIGN.md). */
export function clientOrderStatusTone(status: QuoteStatus): "amber" | "green" | "red" | "teal" | "slate" {
  switch (status) {
    case "SENT":
    case "VIEWED":
    case "AWAITING_APPROVAL":
      return "amber";
    case "APPROVED":
      return "green";
    case "DECLINED":
    case "EXPIRED":
      return "red";
    case "CONVERTED_TO_INVOICE":
      return "teal";
    default:
      return "slate";
  }
}

/**
 * Internal notes for a CLIENT-origin quote: who placed it plus every per-line buyer note,
 * SKU-tagged so the reviewing rep can match notes to lines at a glance. Always prefixed
 * "Client portal order" - that prefix is the human-readable origin marker on the quote.
 */
export function buildClientOrderInternalNotes(
  placedBy: { name: string; email: string },
  lines: Array<{ sku: string; note: string | null }>
): string {
  const parts = [`Client portal order placed by ${placedBy.name} (${placedBy.email}).`];
  for (const line of lines) {
    const note = line.note?.trim();
    if (note) parts.push(`${line.sku}: ${note}`);
  }
  return parts.join("\n");
}
