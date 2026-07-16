/**
 * Bridges the raw normalized pricing source (prisma/seed-data/pricing-source.ts) into the
 * generic TierDefinition/price-map shapes the pricing engine consumes. Used by the seed
 * script (to populate PriceList/PricingTier/PriceListEntry rows) and directly by unit tests
 * to validate the engine against the source sheets without touching a database.
 */
import {
  BULK_RETAIL_TIERS,
  BULK_WHOLESALE_TIERS,
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
        label: `Bulk Retail - ${t.label} (${t.minQty}+ bottles)`,
        minimumBasis: "FLOOR_ONLY" as const,
        minQty: t.minQty,
        maxQty: t.maxQty,
      }));
    case PRICE_LIST_CODES.BULK_WHOLESALE:
      return BULK_WHOLESALE_TIERS.map((t) => ({
        tier: t.tier,
        label: `Bulk Wholesale - ${t.label} (${t.maxQty ? `${t.minQty}–${t.maxQty}` : `${t.minQty}+`} bottles)`,
        minimumBasis: "BAND" as const,
        minQty: t.minQty,
        maxQty: t.maxQty,
      }));
    case PRICE_LIST_CODES.WHOLESALE_SPRAYS:
    case PRICE_LIST_CODES.WHOLESALE_CREAMS:
    case PRICE_LIST_CODES.WHOLESALE_CAPSULES:
      // Business rule (Danny, 7/15/2026 review call): sprays, creams, and capsules sell at ONE
      // flat price regardless of quantity, identical on either ladder, no minimum. Volume
      // discounts on these are negotiated by a rep as a custom quote, never auto-applied.
      // The printed sheets' 50+/100+/200+ columns are intentionally retired from the app.
      return [
        {
          tier: 1,
          label: "Flat price (any quantity)",
          minimumBasis: "FLOOR_ONLY" as const,
          minQty: 1,
          maxQty: null,
        },
      ];
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
    // Flat-price rule (Danny, 7/15/2026): the app sells sprays/creams at the sheet's Tier 1
    // price at any quantity. prices[1]/prices[2] stay in the source transcription but are
    // intentionally not loaded into the app.
    pricesByTier: new Map([[1, item.prices[0]]]),
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
