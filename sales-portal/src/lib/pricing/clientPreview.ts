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
    minimumBasis: t.maxQty != null || t.minQty === Math.min(...variant.tierPrices.map((x) => x.minQty)) ? inferBasis(variant) : "FLOOR_ONLY",
    minQty: t.minQty,
    maxQty: t.maxQty,
  }));
  const priceMap = new Map(variant.tierPrices.map((t) => [t.tierNumber, t.unitPrice]));
  return calculateLineItemPricing(quantity, tierDefs, priceMap, qualifyingQuantity);
}

/** Sum of every unit in the cart — the mix-and-match qualification pool. */
export function cartPooledQuantity(lines: Array<{ quantity: number }>): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/**
 * Reprice EVERY cart line against the current pool. Under pooling, changing any line's
 * quantity can move every other line's tier, so cart mutations must reprice the whole cart,
 * not just the touched line. Capsule lines qualify on their own quantity (their sheet prices
 * a hard 1–49 per-SKU band; the pool must not trip that ceiling) — mirroring the server rule
 * in resolveLineItemPricing.
 */
export function repriceCart<L extends { variantId: string; quantity: number; pricing: LineItemPricingResult }>(
  catalog: CatalogProduct[],
  lines: L[]
): L[] {
  const pooled = cartPooledQuantity(lines);
  return lines.map((line) => {
    const product = catalog.find((p) => p.variants.some((v) => v.id === line.variantId));
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!variant) return line;
    const qualifying = product?.category === "CAPSULE" ? line.quantity : pooled;
    return { ...line, pricing: previewLinePricing(variant, line.quantity, qualifying) };
  });
}

function inferBasis(variant: CatalogVariant): "BAND" | "FLOOR_ONLY" {
  // Bulk Wholesale tiers all carry an explicit maxQty except the final (open) tier; Bulk
  // Retail / Sprays / Creams tiers never carry a maxQty at all. A single non-null maxQty
  // among the tiers is a reliable signal this variant's price list uses banded tiers.
  return variant.tierPrices.some((t) => t.maxQty != null) ? "BAND" : "FLOOR_ONLY";
}
