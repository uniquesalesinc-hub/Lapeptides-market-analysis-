/**
 * Order Mode state: pure reducer over the rep's in-room selling session.
 *
 * All pricing flows through repriceCart/previewLinePricing from lib/pricing/clientPreview -
 * the same helpers the legacy wizard uses - so mix-and-match pooling holds on every cart
 * mutation: changing ANY line's quantity (or the ladder, or the customer) can move EVERY
 * line's tier, so each action reprices the whole cart. This is a client preview only;
 * createQuote re-resolves authoritative pricing server-side before anything persists.
 */
import type { CatalogProduct } from "@/lib/data/catalog";
import { previewLinePricing, repriceCart, samplePricing } from "@/lib/pricing/clientPreview";
import type { CartLine, QuoteLadderCode } from "@/components/quotes/wizard-types";

export interface OrderCustomer {
  id: string;
  businessName: string;
  city: string | null;
  orderCount: number;
  defaultPriceListCode: QuoteLadderCode;
  /** e.g. "Prepaid" / "Net 30" - drives the cart's terms + due-date line. */
  paymentTerms: string;
}

export type CatalogsByLadder = Record<QuoteLadderCode, CatalogProduct[]>;

export interface OrderModeState {
  customer: OrderCustomer | null;
  ladder: QuoteLadderCode;
  overridden: boolean;
  cart: CartLine[];
}

export const initialOrderModeState: OrderModeState = {
  customer: null,
  ladder: "BULK_RETAIL",
  overridden: false,
  cart: [],
};

export type OrderModeAction =
  | { type: "SET_CUSTOMER"; customer: OrderCustomer | null }
  | { type: "SET_LADDER"; ladder: QuoteLadderCode }
  | { type: "ADD_LINE"; variantId: string; quantity: number }
  | { type: "ADD_SAMPLE"; variantId: string; quantity?: number }
  | { type: "SET_QTY"; variantId: string; quantity: number; isSample?: boolean }
  | { type: "REMOVE_LINE"; variantId: string; isSample?: boolean }
  | { type: "SET_LINE_NOTE"; variantId: string; note: string; isSample?: boolean }
  | { type: "SET_LINE_DISCOUNT"; variantId: string; discountPercent: number | null }
  | { type: "CLEAR_CART" }
  | {
      type: "RESTORE";
      customer: OrderCustomer | null;
      ladder: QuoteLadderCode;
      overridden: boolean;
      cart: CartLine[];
    };

/** The customer's ladder if one is selected, with overridden = departure from that default. */
function overriddenAgainst(customer: OrderCustomer | null, ladder: QuoteLadderCode): boolean {
  return customer != null && ladder !== customer.defaultPriceListCode;
}

/** Paid and sample lines of the same variant are distinct: the merge key is variantId+isSample. */
function isLine(l: CartLine, variantId: string, isSample: boolean | undefined): boolean {
  return l.variantId === variantId && !!l.isSample === !!isSample;
}

export function createOrderModeReducer(catalogs: CatalogsByLadder) {
  return function orderModeReducer(state: OrderModeState, action: OrderModeAction): OrderModeState {
    switch (action.type) {
      case "SET_CUSTOMER": {
        // Adopting a customer adopts their assigned ladder; Guest keeps the current one.
        const ladder = action.customer ? action.customer.defaultPriceListCode : state.ladder;
        return {
          ...state,
          customer: action.customer,
          ladder,
          overridden: false,
          cart: repriceCart(catalogs[ladder], state.cart),
        };
      }
      case "SET_LADDER": {
        return {
          ...state,
          ladder: action.ladder,
          overridden: overriddenAgainst(state.customer, action.ladder),
          cart: repriceCart(catalogs[action.ladder], state.cart),
        };
      }
      case "ADD_LINE": {
        if (action.quantity <= 0) return state;
        const catalog = catalogs[state.ladder];
        const product = catalog.find((p) => p.variants.some((v) => v.id === action.variantId));
        const variant = product?.variants.find((v) => v.id === action.variantId);
        if (!product || !variant) return state;

        // One PAID line per variant, always: volume tiers must see the true combined quantity.
        // (A sample line of the same variant stays separate - merge key is variantId+isSample.)
        const existing = state.cart.find((l) => isLine(l, action.variantId, false));
        const next: CartLine[] = existing
          ? state.cart.map((l) =>
              isLine(l, action.variantId, false) ? { ...l, quantity: l.quantity + action.quantity } : l
            )
          : [
              ...state.cart,
              {
                variantId: variant.id,
                sku: variant.sku,
                productName: product.name,
                strength: variant.size,
                quantity: action.quantity,
                pricing: previewLinePricing(variant, action.quantity),
              },
            ];
        return { ...state, cart: repriceCart(catalog, next) };
      }
      case "ADD_SAMPLE": {
        // Free tracked sample (JJ 7/16): $0.00, never pools, coexists with a paid line.
        const quantity = action.quantity ?? 1;
        if (quantity <= 0) return state;
        const catalog = catalogs[state.ladder];
        const product = catalog.find((p) => p.variants.some((v) => v.id === action.variantId));
        const variant = product?.variants.find((v) => v.id === action.variantId);
        if (!product || !variant) return state;

        const existing = state.cart.find((l) => isLine(l, action.variantId, true));
        const next: CartLine[] = existing
          ? state.cart.map((l) =>
              isLine(l, action.variantId, true) ? { ...l, quantity: l.quantity + quantity } : l
            )
          : [
              ...state.cart,
              {
                variantId: variant.id,
                sku: variant.sku,
                productName: product.name,
                strength: variant.size,
                quantity,
                pricing: samplePricing(),
                isSample: true,
              },
            ];
        // Samples never move the pool, but reprice keeps every line's preview honest.
        return { ...state, cart: repriceCart(catalog, next) };
      }
      case "SET_QTY": {
        const next =
          action.quantity <= 0
            ? state.cart.filter((l) => !isLine(l, action.variantId, action.isSample))
            : state.cart.map((l) =>
                isLine(l, action.variantId, action.isSample) ? { ...l, quantity: action.quantity } : l
              );
        return { ...state, cart: repriceCart(catalogs[state.ladder], next) };
      }
      case "REMOVE_LINE": {
        // Removing a line shrinks the pool - the survivors may drop a tier, so reprice.
        return {
          ...state,
          cart: repriceCart(
            catalogs[state.ladder],
            state.cart.filter((l) => !isLine(l, action.variantId, action.isSample))
          ),
        };
      }
      case "SET_LINE_NOTE": {
        // Notes never move prices - no reprice needed.
        return {
          ...state,
          cart: state.cart.map((l) =>
            isLine(l, action.variantId, action.isSample) ? { ...l, note: action.note } : l
          ),
        };
      }
      case "SET_LINE_DISCOUNT": {
        // Discounts ride on top of resolved tier prices; the tier itself never moves.
        const pct =
          action.discountPercent == null
            ? null
            : Math.min(100, Math.max(0, action.discountPercent));
        return {
          ...state,
          cart: state.cart.map((l) =>
            // Discounts only ever apply to paid lines - a sample is already $0.00.
            isLine(l, action.variantId, false) ? { ...l, discountPercent: pct } : l
          ),
        };
      }
      case "CLEAR_CART": {
        return { ...state, cart: [] };
      }
      case "RESTORE": {
        // Never trust stored prices: the catalog (or the pool) may have moved since the
        // snapshot was written, so reprice everything against the restored ladder.
        return {
          customer: action.customer,
          ladder: action.ladder,
          overridden: action.overridden,
          cart: repriceCart(catalogs[action.ladder], action.cart),
        };
      }
      default:
        return state;
    }
  };
}
