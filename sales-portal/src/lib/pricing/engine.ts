/**
 * Pricing calculation engine.
 *
 * This module is intentionally pure (no I/O, no Prisma) so it can be unit tested directly
 * against the numbers in the uploaded pricing sheets. It implements exactly the two tier
 * shapes found in the source material (see docs/PRICING_AUDIT.md):
 *
 *  - FLOOR_ONLY tiers (Bulk Retail, Sprays, Creams): "20+ / 50+ / 75+ bottles" — a quantity
 *    qualifies for the highest tier whose minimum it meets or exceeds. No stated ceiling.
 *  - BAND tiers (Bulk Wholesale): "100–299 bottles" — a quantity must fall within the stated
 *    band. Bands are contiguous and non-overlapping by construction.
 *
 * It never substitutes a different tier than the one a quantity actually qualifies for, never
 * invents a total-order minimum, and never silently discounts below the source price.
 */

export type MinimumBasis = "FLOOR_ONLY" | "BAND";

export interface TierDefinition {
  tier: number;
  label: string;
  minimumBasis: MinimumBasis;
  minQty: number;
  maxQty: number | null;
}

export interface NextEligibleTier {
  tier: TierDefinition;
  unitPrice: number;
  unitsNeeded: number;
}

export interface LineItemPricingResult {
  qualifies: boolean;
  appliedTier: TierDefinition | null;
  unitPrice: number | null;
  lineTotal: number | null;
  minimumRequired: number;
  shortfall: number | null;
  nextEligibleTier: NextEligibleTier | null;
  warning: string | null;
}

/** Round to cents using integer-cent arithmetic to avoid binary float drift. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Select the tier a given quantity qualifies for under a set of tier definitions.
 * Returns `tier: null` (with the next reachable tier, if any) when the quantity doesn't
 * qualify for anything — this happens only under FLOOR_ONLY lists when quantity is below the
 * lowest tier's minimum (e.g. 15 bottles against a 20-bottle Bulk Retail minimum).
 */
export function selectPricingTier(
  quantity: number,
  tiers: TierDefinition[]
): { tier: TierDefinition | null; nextEligible: TierDefinition | null } {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);

  if (quantity <= 0) {
    return { tier: null, nextEligible: sorted[0] ?? null };
  }

  let applied: TierDefinition | null = null;
  for (const t of sorted) {
    if (t.minimumBasis === "FLOOR_ONLY") {
      if (quantity >= t.minQty) {
        // Floor-only tiers are cumulative — keep taking the best (highest-minimum) tier reached.
        applied = t;
      }
    } else {
      const withinBand = quantity >= t.minQty && (t.maxQty == null || quantity <= t.maxQty);
      if (withinBand) {
        applied = t;
        break;
      }
    }
  }

  if (applied) return { tier: applied, nextEligible: null };

  const next = sorted.find((t) => quantity < t.minQty) ?? null;
  return { tier: null, nextEligible: next };
}

/**
 * Calculate the price for one line item: applied tier, unit price, line total, and — whether
 * or not the line currently qualifies — the next cheaper tier the rep could reach, when one
 * exists in the source data. Never returns a price that isn't backed by an explicit
 * `tierPrices` entry.
 */
export function calculateLineItemPricing(
  quantity: number,
  tierDefs: TierDefinition[],
  tierPrices: Map<number, number>
): LineItemPricingResult {
  const minimumRequired = Math.min(...tierDefs.map((t) => t.minQty));
  const { tier, nextEligible } = selectPricingTier(quantity, tierDefs);

  if (!tier) {
    const nextPrice = nextEligible ? tierPrices.get(nextEligible.tier) : undefined;
    return {
      qualifies: false,
      appliedTier: null,
      unitPrice: null,
      lineTotal: null,
      minimumRequired,
      shortfall: Math.max(0, minimumRequired - quantity),
      nextEligibleTier:
        nextEligible && nextPrice != null
          ? { tier: nextEligible, unitPrice: nextPrice, unitsNeeded: nextEligible.minQty - quantity }
          : null,
      warning: `Quantity ${quantity} is below the ${minimumRequired}-unit minimum for this price list. Add ${Math.max(
        0,
        minimumRequired - quantity
      )} more unit(s) to qualify for ${nextEligible?.label ?? "the entry tier"}.`,
    };
  }

  const unitPrice = tierPrices.get(tier.tier);
  if (unitPrice == null) {
    throw new Error(`No price on file for tier ${tier.tier} ("${tier.label}") — refusing to invent one.`);
  }

  const betterTier = tierDefs
    .filter((t) => t.minQty > quantity && t.tier !== tier.tier)
    .sort((a, b) => a.minQty - b.minQty)[0];
  const betterPrice = betterTier ? tierPrices.get(betterTier.tier) : undefined;

  return {
    qualifies: true,
    appliedTier: tier,
    unitPrice,
    lineTotal: round2(unitPrice * quantity),
    minimumRequired,
    shortfall: null,
    nextEligibleTier:
      betterTier && betterPrice != null
        ? { tier: betterTier, unitPrice: betterPrice, unitsNeeded: betterTier.minQty - quantity }
        : null,
    warning: null,
  };
}

// ---------------------------------------------------------------------------
// Totals (fees, discounts, shipping, tax, deposit)
// ---------------------------------------------------------------------------

export type AdjustmentKind =
  | "SHIPPING"
  | "HANDLING"
  | "TESTING_FEE"
  | "PACKAGING_FEE"
  | "RUSH_FEE"
  | "SALES_TAX"
  | "CUSTOMER_DISCOUNT"
  | "REP_DISCOUNT"
  | "ADMIN_CUSTOM_ADJUSTMENT"
  | "ADDITIONAL_FEE";

export const DISCOUNT_KINDS: ReadonlySet<AdjustmentKind> = new Set([
  "CUSTOMER_DISCOUNT",
  "REP_DISCOUNT",
]);
export const FEE_KINDS: ReadonlySet<AdjustmentKind> = new Set([
  "HANDLING",
  "TESTING_FEE",
  "PACKAGING_FEE",
  "RUSH_FEE",
  "ADDITIONAL_FEE",
  "ADMIN_CUSTOM_ADJUSTMENT",
]);

export interface AdjustmentInput {
  kind: AdjustmentKind;
  label: string;
  valueType: "PERCENT" | "FIXED_AMOUNT";
  value: number; // percent (0-100) or a fixed dollar amount
}

export interface QuoteTotals {
  subtotal: number;
  discountTotal: number;
  feeTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  depositAmount: number;
  remainingBalance: number;
  resolvedAdjustments: Array<AdjustmentInput & { amount: number }>;
}

export interface CalculateTotalsInput {
  lineTotals: number[];
  adjustments: AdjustmentInput[];
  depositPercent?: number; // applied against grandTotal, e.g. 50 for a 50% deposit
  depositFixedAmount?: number; // overrides depositPercent if provided
}

/**
 * Resolve every adjustment against the running subtotal and sum into the standard quote/invoice
 * total buckets. Percent-based discounts/fees are calculated against the product subtotal, not
 * against each other, so ordering of adjustments never changes the result.
 */
export function calculateQuoteTotals(input: CalculateTotalsInput): QuoteTotals {
  const subtotal = round2(input.lineTotals.reduce((sum, v) => sum + v, 0));

  const resolvedAdjustments = input.adjustments.map((adj) => {
    const rawAmount = adj.valueType === "PERCENT" ? (subtotal * adj.value) / 100 : adj.value;
    const signedAmount = DISCOUNT_KINDS.has(adj.kind) ? -Math.abs(rawAmount) : Math.abs(rawAmount);
    return { ...adj, amount: round2(signedAmount) };
  });

  const discountTotal = round2(
    resolvedAdjustments.filter((a) => DISCOUNT_KINDS.has(a.kind)).reduce((s, a) => s + a.amount, 0)
  );
  const feeTotal = round2(
    resolvedAdjustments.filter((a) => FEE_KINDS.has(a.kind)).reduce((s, a) => s + a.amount, 0)
  );
  const shippingTotal = round2(
    resolvedAdjustments.filter((a) => a.kind === "SHIPPING").reduce((s, a) => s + a.amount, 0)
  );
  const taxTotal = round2(
    resolvedAdjustments.filter((a) => a.kind === "SALES_TAX").reduce((s, a) => s + a.amount, 0)
  );

  const grandTotal = round2(subtotal + discountTotal + feeTotal + shippingTotal + taxTotal);

  const depositAmount = round2(
    input.depositFixedAmount != null
      ? input.depositFixedAmount
      : input.depositPercent
        ? (grandTotal * input.depositPercent) / 100
        : 0
  );
  const remainingBalance = round2(grandTotal - depositAmount);

  return {
    subtotal,
    discountTotal,
    feeTotal,
    shippingTotal,
    taxTotal,
    grandTotal,
    depositAmount,
    remainingBalance,
    resolvedAdjustments,
  };
}

// ---------------------------------------------------------------------------
// Discount permission enforcement
// ---------------------------------------------------------------------------

export interface DiscountAuthorizationResult {
  authorized: boolean;
  requiresApproval: boolean;
  reason: string | null;
}

/**
 * A sales rep may apply a percent-based discount up to their configured limit without
 * approval. Fixed-amount discounts are converted to an equivalent percent-of-subtotal before
 * comparison. Anything over the limit is flagged as requiring administrator approval rather
 * than being silently blocked or silently allowed.
 */
export function authorizeDiscount(
  discount: AdjustmentInput,
  subtotal: number,
  repDiscountLimitPercent: number
): DiscountAuthorizationResult {
  if (!DISCOUNT_KINDS.has(discount.kind)) {
    return { authorized: true, requiresApproval: false, reason: null };
  }
  const effectivePercent =
    discount.valueType === "PERCENT"
      ? discount.value
      : subtotal > 0
        ? (Math.abs(discount.value) / subtotal) * 100
        : 100;

  if (effectivePercent <= repDiscountLimitPercent) {
    return { authorized: true, requiresApproval: false, reason: null };
  }
  return {
    authorized: false,
    requiresApproval: true,
    reason: `Discount of ${effectivePercent.toFixed(2)}% exceeds your ${repDiscountLimitPercent}% limit and requires administrator approval.`,
  };
}
