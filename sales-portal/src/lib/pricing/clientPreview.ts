import { calculateLineItemPricing, type LineItemPricingResult, type TierDefinition } from "./engine";
import type { CatalogProduct, CatalogVariant } from "@/lib/data/catalog";

/**
 * Client-side pricing preview so quantity changes recalculate instantly while a rep is on the
 * phone with a customer, using the same tier data already fetched for the catalog. This is a
 * preview only — saveQuoteDraft() always re-resolves authoritative pricing from the database
 * before anything is persisted, so a stale client cache can never write a wrong price.
 *
 * `qualifyingQuantity` mirrors the server's mix-and-match pooling: tier selection is measured
 * against the pooled unit total of the whole cart (capsules excepted — see repriceCart).
 */
export function previewLinePricing(
  variant: CatalogVariant,
  quantity: number,
  qualifyingQuantity: number = quantity
): LineItemPricingResult {
  const tierDefs: TierDefinition[] = variant.tierPrices.map((t) => ({
    tier: t.tierNumber,
    label: t.label,
    // Per-tier basis: a stated ceiling makes it a band (retail band 1-19, wholesale
    // bands, capsule 20-49); no ceiling means a floor. Mixed lists (retail band over
    // floor tiers) price correctly this way - a list-wide inference cannot.
    minimumBasis: t.maxQty != null ? ("BAND" as const) : ("FLOOR_ONLY" as const),
    minQty: t.minQty,
    maxQty: t.maxQty,
  }));
  const priceMap = new Map(variant.tierPrices.map((t) => [t.tierNumber, t.unitPrice]));
  return calculateLineItemPricing(quantity, tierDefs, priceMap, qualifyingQuantity);
}

/**
 * Sum of every PAID unit in the cart — the mix-and-match qualification pool.
 * Sample lines are free product (JJ 7/16) and must never help a paid line
 * qualify for a deeper tier.
 */
export function cartPooledQuantity(lines: Array<{ quantity: number; isSample?: boolean }>): number {
  return lines.reduce((sum, l) => (l.isSample ? sum : sum + l.quantity), 0);
}

/** Fixed $0.00 pricing for a sample line — always qualifies, never priced. */
export function samplePricing(): LineItemPricingResult {
  return {
    qualifies: true,
    appliedTier: null,
    unitPrice: 0,
    lineTotal: 0,
    minimumRequired: 0,
    shortfall: null,
    nextEligibleTier: null,
    warning: null,
  };
}

/**
 * Reprice EVERY cart line against the current pool. Under pooling, changing any line's
 * quantity can move every other line's tier, so cart mutations must reprice the whole cart,
 * not just the touched line. Capsule lines qualify on their own quantity (their sheet prices
 * a hard 1–49 per-SKU band; the pool must not trip that ceiling) — mirroring the server rule
 * in resolveLineItemPricing.
 */
export function repriceCart<
  L extends { variantId: string; quantity: number; pricing: LineItemPricingResult; isSample?: boolean }
>(catalog: CatalogProduct[], lines: L[]): L[] {
  const pooled = cartPooledQuantity(lines);
  return lines.map((line) => {
    if (line.isSample) return { ...line, pricing: samplePricing() };
    const product = catalog.find((p) => p.variants.some((v) => v.id === line.variantId));
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!variant) return line;
    const qualifying = product?.category === "CAPSULE" ? line.quantity : pooled;
    return { ...line, pricing: previewLinePricing(variant, line.quantity, qualifying) };
  });
}

