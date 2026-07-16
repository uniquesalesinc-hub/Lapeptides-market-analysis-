import { describe, expect, it } from "vitest";
import { resolveInjectableLadder, toStoreDetail, toStoreProducts } from "./storeCatalog";
import type { CatalogProduct, ProductDetailData } from "./catalog";

const tier = (tierNumber: number, minQty: number, maxQty: number | null, unitPrice: number) => ({
  tierNumber,
  label: tierNumber === 0 ? "Retail" : `Tier ${tierNumber}`,
  minQty,
  maxQty,
  unitPrice,
});

const bpc: CatalogProduct = {
  id: "p1",
  name: "BPC-157",
  category: "INJECTABLE_PEPTIDE",
  description: null,
  imageUrl: null,
  variants: [
    {
      id: "v1",
      sku: "BPC-10",
      size: "10mg",
      isActive: true,
      tierPrices: [tier(0, 1, 19, 59.99), tier(1, 20, 39, 37.5), tier(2, 40, 59, 35)],
      entryPrice: 59.99,
    },
    {
      id: "v2",
      sku: "BPC-15",
      size: "15mg",
      isActive: true,
      tierPrices: [tier(1, 20, 39, 49)],
      entryPrice: 49,
    },
  ],
};

describe("toStoreProducts", () => {
  it("strips every price for anonymous visitors", () => {
    const product = toStoreProducts([bpc], false)[0]!;
    expect(product.fromPrice).toBeNull();
    expect(product.variants.every((v) => v.fromPrice === null)).toBe(true);
    // Names/sizes still browse.
    expect(product.name).toBe("BPC-157");
    expect(product.variants.map((v) => v.size)).toEqual(["10mg", "15mg"]);
  });

  it("prices a logged-in client from the lowest tier per variant, default variant on the card", () => {
    const product = toStoreProducts([bpc], true)[0]!;
    expect(product.variants[0]!.fromPrice).toBe(35); // deepest tier, not the retail band
    expect(product.variants[1]!.fromPrice).toBe(49);
    expect(product.fromPrice).toBe(35); // card "From $" = default (first) variant
  });
});

const detail: ProductDetailData = {
  id: "p1",
  name: "BPC-157",
  category: "INJECTABLE_PEPTIDE",
  description: null,
  imageUrl: null,
  byLadder: {
    BULK_RETAIL: bpc.variants,
    BULK_WHOLESALE: [
      {
        id: "v1",
        sku: "BPC-10",
        size: "10mg",
        isActive: true,
        tierPrices: [tier(1, 20, 39, 30)],
        entryPrice: 30,
      },
    ],
  },
};

describe("toStoreDetail", () => {
  it("keeps the band structure but nulls prices when anonymous", () => {
    const anon = toStoreDetail(detail, "BULK_RETAIL", false);
    expect(anon.pricingVisible).toBe(false);
    expect(anon.ladderName).toBeNull();
    const bands = anon.variants[0]!.bands;
    expect(bands.map((b) => b.label)).toEqual(["Retail", "Tier 1", "Tier 2"]);
    expect(bands.every((b) => b.unitPrice === null)).toBe(true);
  });

  it("serializes the client's ladder only, retail band included, with a ladder name", () => {
    const priced = toStoreDetail(detail, "BULK_RETAIL", true);
    expect(priced.pricingVisible).toBe(true);
    expect(priced.ladderName).toBe("Bulk Retail");
    const bands = priced.variants[0]!.bands;
    expect(bands[0]).toMatchObject({ label: "Retail", minQty: 1, maxQty: 19, unitPrice: 59.99 });
    expect(bands[1]).toMatchObject({ label: "Tier 1", unitPrice: 37.5 });
  });

  it("a wholesale client never sees retail-ladder variants", () => {
    const priced = toStoreDetail(detail, "BULK_WHOLESALE", true);
    expect(priced.ladderName).toBe("Bulk Wholesale");
    expect(priced.variants).toHaveLength(1);
    expect(priced.variants[0]!.bands.map((b) => b.unitPrice)).toEqual([30]);
  });

  it("anonymous falls back to the other ladder's structure when the retail ladder is empty", () => {
    const wholesaleOnly: ProductDetailData = {
      ...detail,
      byLadder: { BULK_RETAIL: [], BULK_WHOLESALE: detail.byLadder.BULK_WHOLESALE },
    };
    const anon = toStoreDetail(wholesaleOnly, "BULK_RETAIL", false);
    expect(anon.variants).toHaveLength(1);
    expect(anon.variants[0]!.bands.every((b) => b.unitPrice === null)).toBe(true);
  });
});

describe("resolveInjectableLadder", () => {
  it("maps anything that is not BULK_WHOLESALE to BULK_RETAIL", () => {
    expect(resolveInjectableLadder("BULK_WHOLESALE")).toBe("BULK_WHOLESALE");
    expect(resolveInjectableLadder("BULK_RETAIL")).toBe("BULK_RETAIL");
    expect(resolveInjectableLadder("WHOLESALE_SPRAYS")).toBe("BULK_RETAIL");
    expect(resolveInjectableLadder(null)).toBe("BULK_RETAIL");
  });
});
