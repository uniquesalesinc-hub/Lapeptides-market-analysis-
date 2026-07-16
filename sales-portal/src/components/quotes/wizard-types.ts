import type { LineItemPricingResult } from "@/lib/pricing/engine";
import type { PriceListCode } from "@prisma/client";

/** Quote-level pricing choice = the INJECTABLE ladder. Format products route themselves. */
export type QuoteLadderCode = Extract<PriceListCode, "BULK_RETAIL" | "BULK_WHOLESALE">;

export interface CartLine {
  variantId: string;
  sku: string;
  productName: string;
  strength: string;
  quantity: number;
  pricing: LineItemPricingResult;
  /** Order Mode extras (optional so the legacy wizard's carts stay valid unchanged). */
  note?: string;
  /** Rep-entered line discount percent (0-100); over-limit values flag approval server-side. */
  discountPercent?: number | null;
  /** Free tracked sample: $0.00, excluded from tier pooling (JJ 7/16). */
  isSample?: boolean;
}

export interface WizardAdjustment {
  id: string; // client-local id for list rendering/removal
  kind:
    | "SHIPPING"
    | "HANDLING"
    | "TESTING_FEE"
    | "PACKAGING_FEE"
    | "RUSH_FEE"
    | "SALES_TAX"
    | "CUSTOMER_DISCOUNT"
    | "REP_DISCOUNT"
    | "ADMIN_CUSTOM_ADJUSTMENT"
    | "ADDITIONAL_FEE";
  label: string;
  valueType: "PERCENT" | "FIXED_AMOUNT";
  value: number;
}

export interface CustomerOption {
  id: string;
  businessName: string;
  contactName: string;
  email: string | null;
  defaultPriceListCode: PriceListCode;
}

export type WizardStep = "customer" | "products" | "charges" | "review";

export const ADJUSTMENT_LABELS: Record<WizardAdjustment["kind"], string> = {
  SHIPPING: "Shipping",
  HANDLING: "Handling",
  TESTING_FEE: "Testing fee",
  PACKAGING_FEE: "Packaging fee",
  RUSH_FEE: "Rush fee",
  SALES_TAX: "Sales tax",
  CUSTOMER_DISCOUNT: "Customer discount",
  REP_DISCOUNT: "Representative discount",
  ADMIN_CUSTOM_ADJUSTMENT: "Admin-approved adjustment",
  ADDITIONAL_FEE: "Additional fee",
};
