import { describe, expect, it } from "vitest";
import {
  calculateLineItemPricing,
  calculateQuoteTotals,
  authorizeDiscount,
  selectPricingTier,
  round2,
  type AdjustmentInput,
} from "./engine";
import { tiersFor, buildFullCatalogEntries, findCatalogEntry } from "./priceLists";
import { PRICE_LIST_CODES } from "../../../prisma/seed-data/pricing-source";

const bulkRetailTiers = tiersFor(PRICE_LIST_CODES.BULK_RETAIL);
const bulkWholesaleTiers = tiersFor(PRICE_LIST_CODES.BULK_WHOLESALE);
const sprayTiers = tiersFor(PRICE_LIST_CODES.WHOLESALE_SPRAYS);
const creamTiers = tiersFor(PRICE_LIST_CODES.WHOLESALE_CREAMS);

function priceMap(sku: string, code: (typeof PRICE_LIST_CODES)[keyof typeof PRICE_LIST_CODES]) {
  const entry = findCatalogEntry(sku, code);
  if (!entry) throw new Error(`fixture missing: ${sku} / ${code}`);
  return entry.pricesByTier;
}

// BPC-157 10mg appears on every one of the 8 bulk sheets — used as the through-line proof
// that the engine reproduces every sheet exactly.
const bpc10Retail = priceMap("BPC157-10MG", PRICE_LIST_CODES.BULK_RETAIL);
const bpc10Wholesale = priceMap("BPC157-10MG", PRICE_LIST_CODES.BULK_WHOLESALE);

describe("BulkRetail_Tier1/2/3.pdf — BPC-157 10mg ($37.50 / $35.00 / $32.50)", () => {
  it("the sheet's printed Tier 1 quantity (20 units) applies Tier 1 at $37.50", () => {
    const r = calculateLineItemPricing(20, bulkRetailTiers, bpc10Retail);
    expect(r.qualifies).toBe(true);
    expect(r.appliedTier?.tier).toBe(1);
    expect(r.unitPrice).toBe(37.5);
    expect(r.lineTotal).toBe(750.0);
  });

  it("below 20 units prices at the lapeptides.net retail band ($59.99, JJ 7/16 model)", () => {
    for (const qty of [1, 4, 19]) {
      const r = calculateLineItemPricing(qty, bulkRetailTiers, bpc10Retail);
      expect(r.qualifies).toBe(true);
      expect(r.appliedTier?.tier).toBe(0);
      expect(r.unitPrice).toBe(59.99);
    }
  });

  it("exact Tier 2 boundary (50 units) applies Tier 2 at $35.00", () => {
    const r = calculateLineItemPricing(50, bulkRetailTiers, bpc10Retail);
    expect(r.appliedTier?.tier).toBe(2);
    expect(r.unitPrice).toBe(35.0);
  });

  it("one unit below the Tier 2 boundary (49 units) stays on Tier 1 at $37.50", () => {
    const r = calculateLineItemPricing(49, bulkRetailTiers, bpc10Retail);
    expect(r.appliedTier?.tier).toBe(1);
    expect(r.unitPrice).toBe(37.5);
  });

  it("one unit above the Tier 2 boundary (51 units) remains on Tier 2 at $35.00", () => {
    const r = calculateLineItemPricing(51, bulkRetailTiers, bpc10Retail);
    expect(r.appliedTier?.tier).toBe(2);
    expect(r.unitPrice).toBe(35.0);
  });

  it("exact Tier 3 minimum (75 units) applies Tier 3 at $32.50 and keeps applying above it (no ceiling)", () => {
    expect(calculateLineItemPricing(75, bulkRetailTiers, bpc10Retail).unitPrice).toBe(32.5);
    expect(calculateLineItemPricing(1000, bulkRetailTiers, bpc10Retail).unitPrice).toBe(32.5);
  });
});

describe("BulkWholesale_Tier1-5.pdf — BPC-157 10mg band boundaries", () => {
  it.each([
    [1, 0, 59.99], // retail band (JJ 7/16): 1-19 at the lapeptides.net price
    [19, 0, 59.99],
    [20, 1, 30.0], // band 1 floor moved 1 -> 20; ceiling unchanged
    [99, 1, 30.0],
    [100, 2, 22.0], // Tier 2 boundary: 100–299
    [299, 2, 22.0],
    [300, 3, 17.5], // Tier 3 boundary: 300–499
    [499, 3, 17.5],
    [500, 4, 16.0], // Tier 4 boundary: 500–999
    [999, 4, 16.0],
    [1000, 5, 13.0], // Tier 5 boundary: 1,000+
    [5000, 5, 13.0],
  ])("qty=%i selects Tier %i at $%s", (qty, tier, price) => {
    const r = calculateLineItemPricing(qty as number, bulkWholesaleTiers, bpc10Wholesale);
    expect(r.appliedTier?.tier).toBe(tier);
    expect(r.unitPrice).toBe(price);
  });

  it("never crosses into Bulk Retail pricing — the two lists stay independent", () => {
    // At 75 units, Bulk Retail would apply Tier 3 ($32.50), but a Bulk-Wholesale-list quote
    // at the same 75 units must use ONLY the Bulk Wholesale Tier 1 price ($30.00).
    const wholesaleResult = calculateLineItemPricing(75, bulkWholesaleTiers, bpc10Wholesale);
    const retailResult = calculateLineItemPricing(75, bulkRetailTiers, bpc10Retail);
    expect(wholesaleResult.unitPrice).toBe(30.0);
    expect(retailResult.unitPrice).toBe(32.5);
    expect(wholesaleResult.unitPrice).not.toBe(retailResult.unitPrice);
  });
});

describe("Sprays — retail band 1-19, flat sheet price from 20 (7/15 flat rule + 7/16 retail band)", () => {
  const prices = priceMap("BPC157SPRAY-SPRAY", PRICE_LIST_CODES.WHOLESALE_SPRAYS);

  it("1-19 sprays price at the site retail ($59.99); 20+ at the flat sheet rate ($35.00)", () => {
    for (const qty of [1, 19]) {
      const r = calculateLineItemPricing(qty, sprayTiers, prices);
      expect(r.qualifies).toBe(true);
      expect(r.appliedTier?.tier).toBe(0);
      expect(r.unitPrice).toBe(59.99);
    }
    for (const qty of [20, 50, 100, 200, 999]) {
      const r = calculateLineItemPricing(qty, sprayTiers, prices);
      expect(r.qualifies).toBe(true);
      expect(r.appliedTier?.tier).toBe(1);
      expect(r.unitPrice).toBe(35.0);
    }
  });

  it("the flat tier is the only step above retail (no further volume tiers)", () => {
    expect(calculateLineItemPricing(50, sprayTiers, prices).nextEligibleTier).toBeNull();
  });
});

describe("Creams — flat price at any quantity (business rule, 7/15/2026 review call)", () => {
  const prices = priceMap("REPAIRCREAM-CREAM", PRICE_LIST_CODES.WHOLESALE_CREAMS);

  it("Repair Cream: $149.99 retail at 1-19, $45.00 flat from 20", () => {
    for (const qty of [1, 19]) {
      expect(calculateLineItemPricing(qty, creamTiers, prices).unitPrice).toBe(149.99);
    }
    for (const qty of [20, 50, 200]) {
      expect(calculateLineItemPricing(qty, creamTiers, prices).unitPrice).toBe(45.0);
    }
  });
});

describe("Additional SKU coverage — GLP, Bio Regulator, flat-priced Blend", () => {
  it("Semaglutide 10mg matches Bulk Wholesale Tier 3 (300-499) exactly", () => {
    const prices = priceMap("SEMAGLUTIDE-10MG", PRICE_LIST_CODES.BULK_WHOLESALE);
    expect(calculateLineItemPricing(300, bulkWholesaleTiers, prices).unitPrice).toBe(44.5);
  });

  it("Bio Regulator (Cardiogen 20mg) matches Bulk Retail Tier 2 exactly", () => {
    const prices = priceMap("CARDIOGEN-20MG", PRICE_LIST_CODES.BULK_RETAIL);
    expect(calculateLineItemPricing(50, bulkRetailTiers, prices).unitPrice).toBe(35.0);
  });

  it("BPC-TB 10/10mg blend has NO wholesale volume discount — every band prices at $34.00 (preserved anomaly)", () => {
    const prices = priceMap("BPCTB-10-10MG", PRICE_LIST_CODES.BULK_WHOLESALE);
    expect(calculateLineItemPricing(1, bulkWholesaleTiers, prices).unitPrice).toBe(69.99); // retail band
    expect(calculateLineItemPricing(20, bulkWholesaleTiers, prices).unitPrice).toBe(34.0);
    expect(calculateLineItemPricing(1000, bulkWholesaleTiers, prices).unitPrice).toBe(34.0);
  });
});

describe("Retail band (JJ 7/16/2026) - 1-19 units at lapeptides.net prices, tiers from 20", () => {
  it("qty 1 and 19 on Bulk Retail price at the site retail ($59.99 for BPC-157 10mg)", () => {
    for (const qty of [1, 19]) {
      const r = calculateLineItemPricing(qty, bulkRetailTiers, bpc10Retail);
      expect(r.qualifies).toBe(true);
      expect(r.appliedTier?.tier).toBe(0);
      expect(r.unitPrice).toBe(59.99);
    }
  });

  it("qty 20 leaves the retail band and prices at printed Tier 1 ($37.50)", () => {
    const r = calculateLineItemPricing(20, bulkRetailTiers, bpc10Retail);
    expect(r.appliedTier?.tier).toBe(1);
    expect(r.unitPrice).toBe(37.5);
  });

  it("a 12-unit pool keeps both injectable lines in the retail band at each SKU's own retail price", () => {
    // Ipamorelin 10mg retail is $49.99; BPC-157 10mg retail is $59.99.
    const ipa10 = priceMap("IPAMORELIN-10MG", PRICE_LIST_CODES.BULK_RETAIL);
    const line1 = calculateLineItemPricing(6, bulkRetailTiers, bpc10Retail, 12);
    const line2 = calculateLineItemPricing(6, bulkRetailTiers, ipa10, 12);
    expect(line1.appliedTier?.tier).toBe(0);
    expect(line1.unitPrice).toBe(59.99);
    expect(line2.appliedTier?.tier).toBe(0);
    expect(line2.unitPrice).toBe(49.99);
  });

  it("a 20-unit pool moves both lines to their printed Tier 1 prices", () => {
    const ipa10 = priceMap("IPAMORELIN-10MG", PRICE_LIST_CODES.BULK_RETAIL);
    const line1 = calculateLineItemPricing(10, bulkRetailTiers, bpc10Retail, 20);
    const line2 = calculateLineItemPricing(10, bulkRetailTiers, ipa10, 20);
    expect(line1.appliedTier?.tier).toBe(1);
    expect(line1.unitPrice).toBe(37.5);
    expect(line2.appliedTier?.tier).toBe(1);
    expect(line2.unitPrice).toBe(30.0);
  });

  it("the wholesale ladder gets the same retail band below its 20-99 band", () => {
    expect(calculateLineItemPricing(10, bulkWholesaleTiers, bpc10Wholesale).unitPrice).toBe(59.99);
    expect(calculateLineItemPricing(20, bulkWholesaleTiers, bpc10Wholesale).unitPrice).toBe(30.0);
  });
});

describe("Multi-SKU / mixed quantities on one quote", () => {
  it("sums independently-tiered lines correctly", () => {
    const ghk = priceMap("GHKCU-50MG", PRICE_LIST_CODES.BULK_WHOLESALE);
    const line1 = calculateLineItemPricing(100, bulkWholesaleTiers, bpc10Wholesale); // $22.00 x100 = 2200
    const line2 = calculateLineItemPricing(500, bulkWholesaleTiers, ghk); // Tier4 $11.00 x500 = 5500
    expect(line1.lineTotal).toBe(2200);
    expect(line2.lineTotal).toBe(5500);
    const totals = calculateQuoteTotals({ lineTotals: [line1.lineTotal!, line2.lineTotal!], adjustments: [] });
    expect(totals.subtotal).toBe(7700);
    expect(totals.grandTotal).toBe(7700);
  });
});

describe("Retail-gap SKUs (no lapeptides.net price) keep the printed floor", () => {
  it("a gap SKU below 20 does not qualify and points at the first priced tier", () => {
    // BPC-157 5mg is a RETAIL_GAPS SKU: the site sells only the 10mg vial, so tier 0
    // has no entry for it. 1-19 of it is not sellable; 20 prices at printed Tier 1.
    const gapPrices = priceMap("BPC157-5MG", PRICE_LIST_CODES.BULK_RETAIL);
    expect(gapPrices.get(0)).toBeUndefined();
    const below = calculateLineItemPricing(10, bulkRetailTiers, gapPrices);
    expect(below.qualifies).toBe(false);
    expect(below.unitPrice).toBeNull();
    expect(below.minimumRequired).toBe(20);
    expect(below.shortfall).toBe(10);
    expect(below.warning).toMatch(/No price on file for Retail/);
    const at20 = calculateLineItemPricing(20, bulkRetailTiers, gapPrices);
    expect(at20.qualifies).toBe(true);
    expect(at20.appliedTier?.tier).toBe(1);
  });

  it("IGF-1 LR3 is excluded from the retail band pending JJ's price ruling", () => {
    const igf = priceMap("IGF1LR3-1MG", PRICE_LIST_CODES.BULK_RETAIL);
    expect(igf.get(0)).toBeUndefined();
  });
});

describe("Discount permission enforcement", () => {
  const discount10pct: AdjustmentInput = {
    kind: "REP_DISCOUNT",
    label: "Loyalty discount",
    valueType: "PERCENT",
    value: 10,
  };

  it("a discount at or under the rep limit is authorized without approval", () => {
    const result = authorizeDiscount(discount10pct, 1000, 10);
    expect(result.authorized).toBe(true);
    expect(result.requiresApproval).toBe(false);
  });

  it("a discount over the rep limit requires administrator approval", () => {
    const result = authorizeDiscount(discount10pct, 1000, 5);
    expect(result.authorized).toBe(false);
    expect(result.requiresApproval).toBe(true);
    expect(result.reason).toMatch(/exceeds your 5% limit/);
  });

  it("a fixed-amount discount is evaluated as an equivalent percent of subtotal", () => {
    const fixed: AdjustmentInput = { kind: "CUSTOMER_DISCOUNT", label: "$150 off", valueType: "FIXED_AMOUNT", value: 150 };
    // $150 off a $1,000 subtotal = 15%, over a 10% rep limit.
    const result = authorizeDiscount(fixed, 1000, 10);
    expect(result.requiresApproval).toBe(true);
  });
});

describe("round2() currency rounding", () => {
  // `Math.round((value + Number.EPSILON) * 100) / 100` is a common "fix" for binary-float
  // currency rounding, but Number.EPSILON (~2.22e-16) is only large enough to correct drift for
  // values near magnitude 1 — at realistic dollar amounts the float error itself is often
  // bigger than EPSILON, so that version silently rounds the wrong way. This pins down a
  // concrete case found during review: a 10% fee on a $48.95 subtotal.
  it("rounds 48.95 * 10% to $4.90, not $4.89", () => {
    expect(round2((48.95 * 10) / 100)).toBe(4.9);
  });

  it("matches exact-decimal rounding across a sweep of subtotal/percentage combinations", () => {
    let mismatches = 0;
    for (let subtotal = 1; subtotal < 2000; subtotal += 0.37) {
      for (const pct of [3, 5, 7, 7.5, 8, 10, 12.5, 15, 18, 20, 25]) {
        const raw = (subtotal * pct) / 100;
        const subtotalCents = Math.round(subtotal * 100);
        const pctScaled = Math.round(pct * 100);
        const numerator = BigInt(subtotalCents) * BigInt(pctScaled);
        const denominator = 10000n;
        const floor = numerator / denominator;
        const remainder = numerator % denominator;
        const exactCents = remainder * 2n >= denominator ? floor + 1n : floor;
        if (BigInt(Math.round(round2(raw) * 100)) !== exactCents) mismatches++;
      }
    }
    expect(mismatches).toBe(0);
  });
});

describe("Fees, shipping, tax, and deposit totals", () => {
  it("computes every bucket independently and never lets a discount touch a fee", () => {
    const adjustments: AdjustmentInput[] = [
      { kind: "CUSTOMER_DISCOUNT", label: "Volume discount", valueType: "PERCENT", value: 10 },
      { kind: "TESTING_FEE", label: "3rd-party testing", valueType: "FIXED_AMOUNT", value: 45 },
      { kind: "SHIPPING", label: "Ground shipping", valueType: "FIXED_AMOUNT", value: 25 },
      { kind: "SALES_TAX", label: "Sales tax", valueType: "PERCENT", value: 8 },
    ];
    const totals = calculateQuoteTotals({ lineTotals: [1000], adjustments, depositPercent: 50 });
    expect(totals.subtotal).toBe(1000);
    expect(totals.discountTotal).toBe(-100); // 10% of 1000
    expect(totals.feeTotal).toBe(45);
    expect(totals.shippingTotal).toBe(25);
    expect(totals.taxTotal).toBe(80); // 8% of the 1000 subtotal, not of the discounted amount
    expect(totals.grandTotal).toBe(1000 - 100 + 45 + 25 + 80);
    expect(totals.depositAmount).toBe(round(totals.grandTotal * 0.5));
    expect(totals.remainingBalance).toBe(round(totals.grandTotal - totals.depositAmount));
  });
});

describe("Quote → Invoice historical pricing preservation", () => {
  it("a line-item snapshot is unaffected by later changes to the live price map", () => {
    const liveMap = new Map(bpc10Wholesale);
    const snapshotAtQuoteTime = calculateLineItemPricing(100, bulkWholesaleTiers, liveMap);
    expect(snapshotAtQuoteTime.unitPrice).toBe(22.0);

    // Simulate an admin publishing a new price list version later.
    liveMap.set(2, 999.99);

    // The snapshot captured at quote time must be untouched (it's a plain value, not a
    // reference into the live map) — this is what QuoteLineItem persists to the database.
    expect(snapshotAtQuoteTime.unitPrice).toBe(22.0);

    // A brand new calculation against the updated map does see the new price — proving the
    // isolation is real and not just a coincidence of immutability.
    const afterUpdate = calculateLineItemPricing(100, bulkWholesaleTiers, liveMap);
    expect(afterUpdate.unitPrice).toBe(999.99);
  });
});

describe("Full catalog integrity", () => {
  const entries = buildFullCatalogEntries();

  it("every catalog entry resolves a valid tier at the minimum of its lowest PRICED tier", () => {
    for (const entry of entries) {
      const tiers = tiersFor(entry.priceListCode);
      // Retail-gap SKUs have no tier-0 entry, so their effective minimum is the lowest
      // tier that actually carries a price for them (JJ 7/16 retail-band model).
      const pricedTiers = tiers.filter((t) => entry.pricesByTier.get(t.tier) != null);
      expect(pricedTiers.length, `${entry.sku} (${entry.priceListCode}) has no priced tier at all`).toBeGreaterThan(0);
      const minQty = Math.min(...pricedTiers.map((t) => t.minQty));
      const result = calculateLineItemPricing(minQty, tiers, entry.pricesByTier);
      expect(result.qualifies, `${entry.sku} (${entry.priceListCode}) failed at its own minimum ${minQty}`).toBe(true);
    }
  });

  it("selectPricingTier never returns a tier the quantity does not actually satisfy", () => {
    for (const tiers of [bulkRetailTiers, bulkWholesaleTiers, sprayTiers]) {
      for (let qty = 0; qty <= 1200; qty += 37) {
        const { tier } = selectPricingTier(qty, tiers);
        if (tier) {
          expect(qty).toBeGreaterThanOrEqual(tier.minQty);
          if (tier.maxQty != null) expect(qty).toBeLessThanOrEqual(tier.maxQty);
        }
      }
    }
  });
});

describe("Capsules — retail band 1-19, wholesale band 20-49, ceiling above (7/16 model)", () => {
  const capsuleTiers = tiersFor(PRICE_LIST_CODES.WHOLESALE_CAPSULES);
  const bpcCaps = priceMap("BPC157CAPSULES-CAPSULES", PRICE_LIST_CODES.WHOLESALE_CAPSULES);

  it("5 bottles prices at the site retail ($89.99)", () => {
    const r = calculateLineItemPricing(5, capsuleTiers, bpcCaps);
    expect(r.qualifies).toBe(true);
    expect(r.appliedTier?.tier).toBe(0);
    expect(r.unitPrice).toBe(89.99);
  });

  it("30 bottles qualifies for the 20-49 wholesale band at $65.00", () => {
    const r = calculateLineItemPricing(30, capsuleTiers, bpcCaps);
    expect(r.qualifies).toBe(true);
    expect(r.appliedTier?.tier).toBe(1);
    expect(r.unitPrice).toBe(65);
    expect(r.lineTotal).toBe(1950);
  });

  it("60 bottles exceeds the priced ceiling and requires a custom quote", () => {
    const r = calculateLineItemPricing(60, capsuleTiers, bpcCaps);
    expect(r.qualifies).toBe(false);
    expect(r.warning).toMatch(/exceeds the 49-unit ceiling/);
  });

  it("engine over-ceiling branch (kept for future banded lists): synthetic 1–49 band", () => {
    const banded = [{ tier: 1, label: "Band", minimumBasis: "BAND" as const, minQty: 1, maxQty: 49 }];
    const r = calculateLineItemPricing(60, banded, new Map([[1, 65]]));
    expect(r.qualifies).toBe(false);
    expect(r.warning).toMatch(/exceeds the 49-unit ceiling/);
    expect(r.warning).toMatch(/custom quote/);
  });

  it("all 10 capsule SKUs are priced at $65 with a $70 suggested retail (metadata only)", () => {
    const capsuleEntries = buildFullCatalogEntries().filter(
      (e) => e.priceListCode === PRICE_LIST_CODES.WHOLESALE_CAPSULES
    );
    expect(capsuleEntries).toHaveLength(10);
    for (const e of capsuleEntries) {
      expect(e.pricesByTier.get(1)).toBe(65);
      expect(e.suggestedRetail).toBe(70);
      // Every portal capsule has a lapeptides.net retail price on tier 0.
      expect(e.pricesByTier.get(0)).toBeGreaterThan(65);
    }
  });
});

describe("Mix-and-match pooling — the pool qualifies the tier, the line bills its own units", () => {
  it("a 60-unit line on a 120-unit pooled order earns the 100–299 wholesale tier", () => {
    const r = calculateLineItemPricing(60, bulkWholesaleTiers, bpc10Wholesale, 120);
    expect(r.qualifies).toBe(true);
    expect(r.appliedTier?.tier).toBe(2);
    expect(r.unitPrice).toBe(22); // Tier 2 sheet price
    expect(r.lineTotal).toBe(round(60 * 22)); // billed on this line's 60 units, not the pool
  });

  it("a 5-unit retail line reaches Tier 3 through a 90-unit cross-format pool", () => {
    const r = calculateLineItemPricing(5, bulkRetailTiers, bpc10Retail, 90);
    expect(r.qualifies).toBe(true);
    expect(r.appliedTier?.tier).toBe(3); // 75+ floor reached via the pool
    expect(r.unitPrice).toBe(32.5);
    expect(r.lineTotal).toBe(round(5 * 32.5));
  });

  it("a small pool lands the retail band when the SKU has a retail price", () => {
    const r = calculateLineItemPricing(2, bulkRetailTiers, bpc10Retail, 4);
    expect(r.qualifies).toBe(true);
    expect(r.appliedTier?.tier).toBe(0);
    expect(r.unitPrice).toBe(59.99);
  });

  it("still warns when a pooled retail-gap SKU misses its first priced tier", () => {
    const gap = priceMap("BPC157-5MG", PRICE_LIST_CODES.BULK_RETAIL);
    const r = calculateLineItemPricing(2, bulkRetailTiers, gap, 4);
    expect(r.qualifies).toBe(false);
    expect(r.warning).toMatch(/No price on file for Retail/);
  });

  it("omitting the pool preserves per-SKU behavior exactly (default parameter)", () => {
    const explicit = calculateLineItemPricing(250, bulkWholesaleTiers, bpc10Wholesale, 250);
    const legacy = calculateLineItemPricing(250, bulkWholesaleTiers, bpc10Wholesale);
    expect(legacy).toEqual(explicit);
  });
});

function round(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
