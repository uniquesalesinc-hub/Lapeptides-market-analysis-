/**
 * Bridges the raw normalized pricing source (prisma/seed-data/pricing-source.ts) into the
 * generic TierDefinition/price-map shapes the pricing engine consumes. Used by the seed
 * script (to populate PriceList/PricingTier/PriceListEntry rows) and directly by unit tests
 * to validate the engine against the source sheets without touching a database.
 */
import {
  BULK_RETAIL_TIERS,
  BULK_WHOLESALE_TIERS,
  SPRAY_CREAM_TIERS,
  CAPSULE_TIERS,
  FULL_BULK_CATALOG,
  SPRAYS,
  CREAMS,
  CAPSULES,
  PRICE_LIST_CODES,
  makeSku,
  type PriceListCode,
  type BulkCatalogItem,
  type SprayCreamCatalogItem,
  type CapsuleCatalogItem,
} from "../../../prisma/seed-data/pricing-source";
import type { TierDefinition } from "./engine";

export function tiersFor(code: PriceListCode): TierDefinition[] {
  switch (code) {
    case PRICE_LIST_CODES.BULK_RETAIL:
      return BULK_RETAIL_TIERS.map((t) => ({
        tier: t.tier,
        label: `Bulk Retail — ${t.label} (${t.minQty}+ bottles)`,
        minimumBasis: "FLOOR_ONLY" as const,
        minQty: t.minQty,
        maxQty: t.maxQty,
      }));
    case PRICE_LIST_CODES.BULK_WHOLESALE:
      return BULK_WHOLESALE_TIERS.map((t) => ({
        tier: t.tier,
        label: `Bulk Wholesale — ${t.label} (${t.maxQty ? `${t.minQty}–${t.maxQty}` : `${t.minQty}+`} bottles)`,
        minimumBasis: "BAND" as const,
        minQty: t.minQty,
        maxQty: t.maxQty,
      }));
    case PRICE_LIST_CODES.WHOLESALE_SPRAYS:
    case PRICE_LIST_CODES.WHOLESALE_CREAMS:
      return SPRAY_CREAM_TIERS.map((t) => ({
        tier: t.tier,
        label: `${t.label} (${t.minQty}+ units)`,
        minimumBasis: "FLOOR_ONLY" as const,
        minQty: t.minQty,
        maxQty: t.maxQty,
      }));
    case PRICE_LIST_CODES.WHOLESALE_CAPSULES:
      // One priced band only (draft sheet): 1–49 bottles. 50+ = manual quote, by design.
      return CAPSULE_TIERS.map((t) => ({
        tier: t.tier,
        label: `${t.label} (${t.minQty}–${t.maxQty} bottles)`,
        minimumBasis: "BAND" as const,
        minQty: t.minQty,
        maxQty: t.maxQty,
      }));
    default: {
      const exhaustive: never = code;
      throw new Error(`Unknown price list code: ${exhaustive}`);
    }
  }
}

export interface CatalogEntry {
  sku: string;
  name: string;
  size: string;
  category: string;
  priceListCode: PriceListCode;
  pricesByTier: Map<number, number>;
  /** MSRP metadata (capsules only today) — informational, never used in quote math. */
  suggestedRetail?: number;
}

function bulkItemToEntries(item: BulkCatalogItem): CatalogEntry[] {
  const sku = makeSku(item.name, item.size);
  const retail: CatalogEntry = {
    sku,
    name: item.name,
    size: item.size,
    category: item.category,
    priceListCode: PRICE_LIST_CODES.BULK_RETAIL,
    pricesByTier: new Map([
      [1, item.bulkRetail[0]],
      [2, item.bulkRetail[1]],
      [3, item.bulkRetail[2]],
    ]),
  };
  const wholesale: CatalogEntry = {
    sku,
    name: item.name,
    size: item.size,
    category: item.category,
    priceListCode: PRICE_LIST_CODES.BULK_WHOLESALE,
    pricesByTier: new Map([
      [1, item.bulkWholesale[0]],
      [2, item.bulkWholesale[1]],
      [3, item.bulkWholesale[2]],
      [4, item.bulkWholesale[3]],
      [5, item.bulkWholesale[4]],
    ]),
  };
  return [retail, wholesale];
}

function sprayCreamToEntry(item: SprayCreamCatalogItem): CatalogEntry {
  const sku = makeSku(item.name, item.category === "NASAL_SPRAY" ? "spray" : "cream");
  const code =
    item.category === "NASAL_SPRAY" ? PRICE_LIST_CODES.WHOLESALE_SPRAYS : PRICE_LIST_CODES.WHOLESALE_CREAMS;
  return {
    sku,
    name: item.name,
    size: item.category === "NASAL_SPRAY" ? "spray" : "cream",
    category: item.category,
    priceListCode: code,
    pricesByTier: new Map([
      [1, item.prices[0]],
      [2, item.prices[1]],
      [3, item.prices[2]],
    ]),
  };
}

function capsuleToEntry(item: CapsuleCatalogItem): CatalogEntry {
  return {
    sku: makeSku(item.name, "capsules"),
    name: item.name,
    size: "capsules",
    category: item.category,
    priceListCode: PRICE_LIST_CODES.WHOLESALE_CAPSULES,
    pricesByTier: new Map([[1, item.wholesalePrice]]),
    suggestedRetail: item.suggestedRetail,
  };
}

/** Every (SKU, price list) combination the app can quote against, flattened for lookup/seeding. */
export function buildFullCatalogEntries(): CatalogEntry[] {
  return [
    ...FULL_BULK_CATALOG.flatMap(bulkItemToEntries),
    ...SPRAYS.map(sprayCreamToEntry),
    ...CREAMS.map(sprayCreamToEntry),
    ...CAPSULES.map(capsuleToEntry),
  ];
}

export function findCatalogEntry(sku: string, priceListCode: PriceListCode): CatalogEntry | undefined {
  return buildFullCatalogEntries().find((e) => e.sku === sku && e.priceListCode === priceListCode);
}
