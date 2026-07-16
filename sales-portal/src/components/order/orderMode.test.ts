import { describe, expect, it } from "vitest";
import type { ProductCategory } from "@prisma/client";
import type { CatalogProduct } from "@/lib/data/catalog";
import { tiersFor, findCatalogEntry } from "@/lib/pricing/priceLists";
import { PRICE_LIST_CODES } from "../../../prisma/seed-data/pricing-source";
import {
  createOrderModeReducer,
  initialOrderModeState,
  type CatalogsByLadder,
  type OrderCustomer,
  type OrderModeState,
} from "./orderMode";

// ---------------------------------------------------------------------------
// Fixtures built from the SAME normalized pricing source the engine tests use
// (prisma/seed-data/pricing-source.ts), so every expected unit price below is
// the exact sheet price, never a made-up number.
// ---------------------------------------------------------------------------

type SourceCode = (typeof PRICE_LIST_CODES)[keyof typeof PRICE_LIST_CODES];

function productFor(sku: string, category: ProductCategory, code: SourceCode): CatalogProduct {
  const entry = findCatalogEntry(sku, code);
  if (!entry) throw new Error(`fixture missing: ${sku} / ${code}`);
  const tierPrices = tiersFor(code).map((t) => ({
    tierNumber: t.tier,
    label: t.label,
    minQty: t.minQty,
    maxQty: t.maxQty,
    unitPrice: entry.pricesByTier.get(t.tier)!,
  }));
  return {
    id: `prod-${sku}-${code}`,
    name: entry.name,
    category,
    description: null,
    imageUrl: null,
    variants: [
      {
        id: sku, // variant ids are stable across ladders, exactly like the real catalog
        sku,
        size: entry.size,
        isActive: true,
        tierPrices,
        entryPrice: tierPrices[0]?.unitPrice ?? null,
      },
    ],
  };
}

const catalogs: CatalogsByLadder = {
  BULK_RETAIL: [
    productFor("BPC157-10MG", "INJECTABLE_PEPTIDE", PRICE_LIST_CODES.BULK_RETAIL),
    productFor("GHKCU-50MG", "INJECTABLE_PEPTIDE", PRICE_LIST_CODES.BULK_RETAIL),
    productFor("BPC157CAPSULES-CAPSULES", "CAPSULE", PRICE_LIST_CODES.WHOLESALE_CAPSULES),
  ],
  BULK_WHOLESALE: [
    productFor("BPC157-10MG", "INJECTABLE_PEPTIDE", PRICE_LIST_CODES.BULK_WHOLESALE),
    productFor("GHKCU-50MG", "INJECTABLE_PEPTIDE", PRICE_LIST_CODES.BULK_WHOLESALE),
    productFor("BPC157CAPSULES-CAPSULES", "CAPSULE", PRICE_LIST_CODES.WHOLESALE_CAPSULES),
  ],
};

const reduce = createOrderModeReducer(catalogs);

const wholesaleCustomer: OrderCustomer = {
  id: "cust-w",
  businessName: "Scottsdale Wellness",
  city: "Scottsdale",
  orderCount: 4,
  defaultPriceListCode: "BULK_WHOLESALE",
  paymentTerms: "Net 30",
};

const retailCustomer: OrderCustomer = {
  id: "cust-r",
  businessName: "Mesa Med Spa",
  city: "Mesa",
  orderCount: 1,
  defaultPriceListCode: "BULK_RETAIL",
  paymentTerms: "Prepaid",
};

function stateWith(partial: Partial<OrderModeState>): OrderModeState {
  return { ...initialOrderModeState, ...partial };
}

function line(state: OrderModeState, variantId: string) {
  const found = state.cart.find((l) => l.variantId === variantId);
  if (!found) throw new Error(`no cart line for ${variantId}`);
  return found;
}

describe("SET_CUSTOMER", () => {
  it("adopts the customer's default price list and clears overridden", () => {
    const start = stateWith({ ladder: "BULK_RETAIL", overridden: true });
    const next = reduce(start, { type: "SET_CUSTOMER", customer: wholesaleCustomer });
    expect(next.customer).toEqual(wholesaleCustomer);
    expect(next.ladder).toBe("BULK_WHOLESALE");
    expect(next.overridden).toBe(false);
  });

  it("reprices existing cart lines onto the new customer's ladder", () => {
    // 60 bottles of BPC-157 10mg: Bulk Retail Tier 2 (50+) = $35.00; Bulk Wholesale
    // Tier 1 (1-99) = $30.00. Same sheet prices proven in engine.test.ts.
    let state = stateWith({ ladder: "BULK_RETAIL" });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 60 });
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(35.0);

    state = reduce(state, { type: "SET_CUSTOMER", customer: wholesaleCustomer });
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(30.0);
    expect(line(state, "BPC157-10MG").pricing.appliedTier?.tier).toBe(1);
  });

  it("selecting Guest (null) keeps the ladder, clears overridden, keeps the cart", () => {
    let state = stateWith({ customer: retailCustomer, ladder: "BULK_WHOLESALE", overridden: true });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 100 });
    const next = reduce(state, { type: "SET_CUSTOMER", customer: null });
    expect(next.customer).toBeNull();
    expect(next.ladder).toBe("BULK_WHOLESALE");
    expect(next.overridden).toBe(false);
    expect(next.cart).toHaveLength(1);
  });
});

describe("SET_LADDER", () => {
  it("marks the state overridden when moving off the customer default and reprices", () => {
    let state = reduce(initialOrderModeState, { type: "SET_CUSTOMER", customer: retailCustomer });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 60 });
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(35.0); // retail Tier 2

    state = reduce(state, { type: "SET_LADDER", ladder: "BULK_WHOLESALE" });
    expect(state.overridden).toBe(true);
    expect(state.ladder).toBe("BULK_WHOLESALE");
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(30.0); // wholesale Tier 1
  });

  it("switching back to the customer default clears overridden", () => {
    let state = reduce(initialOrderModeState, { type: "SET_CUSTOMER", customer: retailCustomer });
    state = reduce(state, { type: "SET_LADDER", ladder: "BULK_WHOLESALE" });
    expect(state.overridden).toBe(true);
    state = reduce(state, { type: "SET_LADDER", ladder: "BULK_RETAIL" });
    expect(state.overridden).toBe(false);
  });
});

describe("Injectable pooling across cart mutations (mirrors engine.test.ts mix-and-match)", () => {
  it("two injectables whose pooled quantity crosses a tier boundary both get the pooled tier price", () => {
    // Bulk Wholesale bands: Tier 1 = 1-99, Tier 2 = 100-299.
    // BPC-157 10mg: T1 $30.00 / T2 $22.00. GHK-Cu 50mg: T1 $18.00 / T2 $14.00.
    let state = stateWith({ ladder: "BULK_WHOLESALE" });

    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 60 });
    expect(line(state, "BPC157-10MG").pricing.appliedTier?.tier).toBe(1);
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(30.0);

    // Adding 60 GHK-Cu pushes the pool to 120 -> BOTH lines move to Tier 2.
    state = reduce(state, { type: "ADD_LINE", variantId: "GHKCU-50MG", quantity: 60 });
    expect(line(state, "BPC157-10MG").pricing.appliedTier?.tier).toBe(2);
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(22.0);
    expect(line(state, "BPC157-10MG").pricing.lineTotal).toBe(60 * 22.0);
    expect(line(state, "GHKCU-50MG").pricing.appliedTier?.tier).toBe(2);
    expect(line(state, "GHKCU-50MG").pricing.unitPrice).toBe(14.0);
    expect(line(state, "GHKCU-50MG").pricing.lineTotal).toBe(60 * 14.0);
  });

  it("SET_QTY below the boundary drops EVERY line back to the lower tier", () => {
    let state = stateWith({ ladder: "BULK_WHOLESALE" });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 60 });
    state = reduce(state, { type: "ADD_LINE", variantId: "GHKCU-50MG", quantity: 60 });

    state = reduce(state, { type: "SET_QTY", variantId: "GHKCU-50MG", quantity: 30 }); // pool 90
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(30.0);
    expect(line(state, "GHKCU-50MG").pricing.unitPrice).toBe(18.0);
  });

  it("REMOVE_LINE shrinks the pool and reprices the survivors", () => {
    let state = stateWith({ ladder: "BULK_WHOLESALE" });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 60 });
    state = reduce(state, { type: "ADD_LINE", variantId: "GHKCU-50MG", quantity: 60 });
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(22.0);

    state = reduce(state, { type: "REMOVE_LINE", variantId: "GHKCU-50MG" });
    expect(state.cart).toHaveLength(1);
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(30.0);
  });

  it("ADD_LINE for an existing variant merges quantities into one line (pool stays honest)", () => {
    let state = stateWith({ ladder: "BULK_WHOLESALE" });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 60 });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 60 });
    expect(state.cart).toHaveLength(1);
    expect(line(state, "BPC157-10MG").quantity).toBe(120);
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(22.0); // 120 -> Tier 2
  });

  it("capsule lines are exempt from pooling: flat $65 regardless of the injectable pool", () => {
    let state = stateWith({ ladder: "BULK_WHOLESALE" });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 150 });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157CAPSULES-CAPSULES", quantity: 10 });

    const capsule = line(state, "BPC157CAPSULES-CAPSULES");
    expect(capsule.pricing.unitPrice).toBe(65.0);
    expect(capsule.pricing.lineTotal).toBe(650.0);
    // The injectable still earns the pooled tier (150 + 10 = 160 -> Tier 2 band 100-299).
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(22.0);
  });

  it("SET_QTY to zero removes the line", () => {
    let state = stateWith({ ladder: "BULK_WHOLESALE" });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 60 });
    state = reduce(state, { type: "SET_QTY", variantId: "BPC157-10MG", quantity: 0 });
    expect(state.cart).toHaveLength(0);
  });
});

describe("RESTORE (sessionStorage rehydration)", () => {
  it("reprices the restored cart against the restored ladder instead of trusting stored prices", () => {
    let seeded = stateWith({ ladder: "BULK_WHOLESALE" });
    seeded = reduce(seeded, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 120 });
    // Simulate a stale stored snapshot whose pricing no longer matches the ladder.
    const tampered = {
      ...seeded,
      cart: seeded.cart.map((l) => ({ ...l, pricing: { ...l.pricing, unitPrice: 1.23 } })),
    };
    const restored = reduce(initialOrderModeState, {
      type: "RESTORE",
      customer: wholesaleCustomer,
      ladder: "BULK_WHOLESALE",
      overridden: false,
      cart: tampered.cart,
    });
    expect(restored.customer).toEqual(wholesaleCustomer);
    expect(line(restored, "BPC157-10MG").pricing.unitPrice).toBe(22.0);
  });
});

describe("SET_LINE_NOTE / SET_LINE_DISCOUNT (cart panel line extras)", () => {
  it("stores a note on the targeted line without touching its pricing", () => {
    let state = stateWith({ ladder: "BULK_WHOLESALE" });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 120 });
    state = reduce(state, { type: "SET_LINE_NOTE", variantId: "BPC157-10MG", note: "Ship cold" });
    expect(line(state, "BPC157-10MG").note).toBe("Ship cold");
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(22.0);
  });

  it("stores a clamped discount percent and clears it with null", () => {
    let state = stateWith({ ladder: "BULK_WHOLESALE" });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 120 });
    state = reduce(state, { type: "SET_LINE_DISCOUNT", variantId: "BPC157-10MG", discountPercent: 150 });
    expect(line(state, "BPC157-10MG").discountPercent).toBe(100);
    state = reduce(state, { type: "SET_LINE_DISCOUNT", variantId: "BPC157-10MG", discountPercent: 7.5 });
    expect(line(state, "BPC157-10MG").discountPercent).toBe(7.5);
    state = reduce(state, { type: "SET_LINE_DISCOUNT", variantId: "BPC157-10MG", discountPercent: null });
    expect(line(state, "BPC157-10MG").discountPercent).toBeNull();
  });

  it("notes and discounts survive repricing mutations (pooling reprices, extras persist)", () => {
    let state = stateWith({ ladder: "BULK_WHOLESALE" });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 60 });
    state = reduce(state, { type: "SET_LINE_NOTE", variantId: "BPC157-10MG", note: "Sample labels" });
    state = reduce(state, { type: "SET_LINE_DISCOUNT", variantId: "BPC157-10MG", discountPercent: 5 });
    // Pool crosses the tier boundary - the line reprices but keeps its extras.
    state = reduce(state, { type: "ADD_LINE", variantId: "GHKCU-50MG", quantity: 60 });
    expect(line(state, "BPC157-10MG").pricing.unitPrice).toBe(22.0);
    expect(line(state, "BPC157-10MG").note).toBe("Sample labels");
    expect(line(state, "BPC157-10MG").discountPercent).toBe(5);
  });
});

describe("CLEAR_CART", () => {
  it("empties the cart and keeps the customer context", () => {
    let state = reduce(initialOrderModeState, { type: "SET_CUSTOMER", customer: wholesaleCustomer });
    state = reduce(state, { type: "ADD_LINE", variantId: "BPC157-10MG", quantity: 60 });
    state = reduce(state, { type: "CLEAR_CART" });
    expect(state.cart).toHaveLength(0);
    expect(state.customer).toEqual(wholesaleCustomer);
  });
});
