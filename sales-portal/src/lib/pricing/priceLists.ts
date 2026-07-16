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
import { RETAIL_PRICES } from "../../../prisma/seed-data/retail-source";
import type { TierDefinition } from "./engine";

/**
 * Retail band (JJ, 7/16/2026): quantities 1-19 price at the lapeptides.net single-unit
 * retail price, per SKU, on every list. SKUs without a site retail price (RETAIL_GAPS in
 * retail-source.ts) simply have no tier-0 entry, so their minimum stays the printed floor.
 */
export const RETAIL_BAND_TIER: TierDefinition = {
  tier: 0,
  label: "Retail (1-19 units)",
  minimumBasis: "BAND",
  minQty: 1,
  maxQty: 19,
};

/**
 * IGF-1 LR3 is excluded from the retail band until JJ resolves the price conflict:
 * the site sells 1mg at $59.99 while the bulk sheet's Tier 1 (20+) is $95.00/unit.
 */
const RETAIL_EXCLUDED = new Set(["IGF-1 LR3|1mg"]);

const retailByNameSize = new Map(
  RETAIL_PRICES.filter(([name, size]) => !RETAIL_EXCLUDED.has(`${name}|${size}`)).map(
    ([name, size, price]) => [`${name}|${size}`, price] as const
  )
);

export function retailPriceFor(name: string, size: string): number | undefined {
  return retailByNameSize.get(`${name}|${size}`);
}

export function tiersFor(code: PriceListCode): TierDefinition[] {
  switch (code) {
    case PRICE_LIST_CODES.BULK_RETAIL:
      return [
        RETAIL_BAND_TIER,
        ...BULK_RETAIL_TIERS.map((t) => ({
          tier: t.tier,
          label: `Bulk Retail - ${t.label} (${t.minQty}+ bottles)`,
          minimumBasis: "FLOOR_ONLY" as const,
          minQty: t.minQty,
          maxQty: t.maxQty,
        })),
      ];
    case PRICE_LIST_CODES.BULK_WHOLESALE:
      return [
        RETAIL_BAND_TIER,
        ...BULK_WHOLESALE_TIERS.map((t) => ({
          tier: t.tier,
          label: `Bulk Wholesale - ${t.label} (${t.maxQty ? `${t.minQty}–${t.maxQty}` : `${t.minQty}+`} bottles)`,
          minimumBasis: "BAND" as const,
          minQty: t.minQty,
          maxQty: t.maxQty,
        })),
      ];
    case PRICE_LIST_CODES.WHOLESALE_SPRAYS:
    case PRICE_LIST_CODES.WHOLESALE_CREAMS:
      // Flat-price rule (Danny, 7/15/2026) now applies from 20 units; 1-19 is the
      // retail band (JJ, 7/16/2026). Volume discounts beyond the flat price stay
      // rep-negotiated custom quotes; the printed 50+/100+/200+ columns stay retired.
      return [
        RETAIL_BAND_TIER,
        {
          tier: 1,
          label: "Flat price (20+ units)",
          minimumBasis: "FLOOR_ONLY" as const,
          minQty: 20,
          maxQty: null,
        },
      ];
    case PRICE_LIST_CODES.WHOLESALE_CAPSULES:
      // The capsule sheet prices a hard 1-49 band; with the retail band at 1-19 the
      // wholesale price covers 20-49. 50+ still requires a custom quote (ceiling kept).
      return [
        RETAIL_BAND_TIER,
        {
          tier: 1,
          label: "Wholesale (20-49 bottles)",
          minimumBasis: "BAND" as const,
          minQty: 20,
          maxQty: 49,
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

/** Prepend the SKU's tier-0 retail price when lapeptides.net has one (see retail-source.ts). */
function withRetailBand(
  name: string,
  size: string,
  prices: Array<[number, number]>
): Map<number, number> {
  const retail = retailPriceFor(name, size);
  return new Map(retail != null ? [[0, retail] as [number, number], ...prices] : prices);
}

function bulkItemToEntries(item: BulkCatalogItem): CatalogEntry[] {
  const sku = makeSku(item.name, item.size);
  const retail: CatalogEntry = {
    sku,
    name: item.name,
    size: item.size,
    category: item.category,
    priceListCode: PRICE_LIST_CODES.BULK_RETAIL,
    pricesByTier: withRetailBand(item.name, item.size, [
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
    pricesByTier: withRetailBand(item.name, item.size, [
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
  const size = item.category === "NASAL_SPRAY" ? "spray" : "cream";
  const sku = makeSku(item.name, size);
  const code =
    item.category === "NASAL_SPRAY" ? PRICE_LIST_CODES.WHOLESALE_SPRAYS : PRICE_LIST_CODES.WHOLESALE_CREAMS;
  return {
    sku,
    name: item.name,
    size,
    category: item.category,
    priceListCode: code,
    // Flat-price rule (Danny, 7/15/2026): the app sells sprays/creams at the sheet's Tier 1
    // price (now from 20 units; 1-19 is the retail band). prices[1]/prices[2] stay in the
    // source transcription but are intentionally not loaded into the app.
    pricesByTier: withRetailBand(item.name, size, [[1, item.prices[0]]]),
  };
}

function capsuleToEntry(item: CapsuleCatalogItem): CatalogEntry {
  return {
    sku: makeSku(item.name, "capsules"),
    name: item.name,
    size: "capsules",
    category: item.category,
    priceListCode: PRICE_LIST_CODES.WHOLESALE_CAPSULES,
    pricesByTier: withRetailBand(item.name, "capsules", [[1, item.wholesalePrice]]),
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
