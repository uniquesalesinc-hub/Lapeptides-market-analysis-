import { describe, expect, it } from "vitest";
import { COSTS, COST_BANDS } from "../../../prisma/seed-data/cost-source";
import { makeSku, PRICE_LIST_CODES } from "../../../prisma/seed-data/pricing-source";
import { buildFullCatalogEntries, findCatalogEntry } from "./priceLists";

describe("Hard-cost sheet integrity (admin-only COGS data)", () => {
  const catalogSkus = new Set(buildFullCatalogEntries().map((e) => e.sku));

  it("every cost row maps to an existing catalog SKU (no orphans, no typos)", () => {
    for (const [name, size] of COSTS) {
      const sku = makeSku(name, size);
      expect(catalogSkus.has(sku), `${name} ${size} -> ${sku}`).toBe(true);
    }
  });

  it("covers 74 SKUs with 5 bands each, mirroring the wholesale bands", () => {
    expect(COSTS.length).toBe(74); // 46 peptides + 16 bioregulators + 12 blends
    expect(COST_BANDS.map((b) => b.minQty)).toEqual([1, 100, 300, 500, 1000]);
  });

  it("spot-checks exact transcribed values", () => {
    const row = (n: string, s: string) => COSTS.find(([rn, rs]) => rn === n && rs === s)!;
    expect(row("BPC-157", "10mg").slice(2)).toEqual([10, 8, 7, 7, 6.5]);
    expect(row("FOXO4-DRI", "10mg").slice(2)).toEqual([50, 48, 46, 44, 42]);
    expect(row("Ipa/CJC", "10/10mg").slice(2)).toEqual([25, 23, 20, 20, 19]);
    expect(row("Pinealon", "20mg").slice(2)).toEqual([10, 9, 8, 8, 7]);
  });

  it("cost never meets or exceeds the wholesale sell price at the same band (margin sanity)", () => {
    for (const [name, size, ...cs] of COSTS) {
      const entry = findCatalogEntry(makeSku(name, size), PRICE_LIST_CODES.BULK_WHOLESALE);
      if (!entry) continue; // (all cost rows are injectables today, but stay safe)
      for (const band of COST_BANDS) {
        const sell = entry.pricesByTier.get(band.tier);
        if (sell == null) continue;
        expect(cs[band.tier - 1]!, `${name} ${size} band ${band.tier}: cost vs sell ${sell}`).toBeLessThan(sell);
      }
    }
  });
});
