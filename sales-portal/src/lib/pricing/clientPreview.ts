import { calculateLineItemPricing, type LineItemPricingResult, type TierDefinition } from "./engine";
import type { CatalogVariant } from "@/lib/data/catalog";

/**
 * Client-side pricing preview so quantity changes recalculate instantly while a rep is on the
 * phone with a customer, using the same tier data already fetched for the catalog. This is a
 * preview only — saveQuoteDraft() always re-resolves authoritative pricing from the database
 * before anything is persisted, so a stale client cache can never write a wrong price.
 */
export function previewLinePricing(variant: CatalogVariant, quantity: number): LineItemPricingResult {
  const tierDefs: TierDefinition[] = variant.tierPrices.map((t) => ({
    tier: t.tierNumber,
    label: t.label,
    minimumBasis: t.maxQty != null || t.minQty === Math.min(...variant.tierPrices.map((x) => x.minQty)) ? inferBasis(variant) : "FLOOR_ONLY",
    minQty: t.minQty,
    maxQty: t.maxQty,
  }));
  const priceMap = new Map(variant.tierPrices.map((t) => [t.tierNumber, t.unitPrice]));
  return calculateLineItemPricing(quantity, tierDefs, priceMap);
}

function inferBasis(variant: CatalogVariant): "BAND" | "FLOOR_ONLY" {
  // Bulk Wholesale tiers all carry an explicit maxQty except the final (open) tier; Bulk
  // Retail / Sprays / Creams tiers never carry a maxQty at all. A single non-null maxQty
  // among the tiers is a reliable signal this variant's price list uses banded tiers.
  return variant.tierPrices.some((t) => t.maxQty != null) ? "BAND" : "FLOOR_ONLY";
}
