import { z } from "zod";

export const adjustmentInputSchema = z.object({
  kind: z.enum([
    "SHIPPING",
    "HANDLING",
    "TESTING_FEE",
    "PACKAGING_FEE",
    "RUSH_FEE",
    "SALES_TAX",
    "CUSTOMER_DISCOUNT",
    "REP_DISCOUNT",
    "ADMIN_CUSTOM_ADJUSTMENT",
    "ADDITIONAL_FEE",
  ]),
  label: z.string().min(1).max(120),
  valueType: z.enum(["PERCENT", "FIXED_AMOUNT"]),
  value: z.number().min(0),
});

export const quoteLineInputSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
  /** Free tracked sample (JJ 7/16): $0.00 line, excluded from tier pooling. */
  isSample: z.boolean().optional(),
});

export const quoteDraftSchema = z.object({
  quoteId: z.string().nullable(),
  customerId: z.string().min(1, "Select a customer."),
  priceListCode: // The quote-level code picks the INJECTABLE ladder; sprays/creams/capsules always route
  // to their own price lists in resolveLineItemPricing.
  z.enum(["BULK_RETAIL", "BULK_WHOLESALE"]),
  lineItems: z.array(quoteLineInputSchema).min(1, "Add at least one product."),
  adjustments: z.array(adjustmentInputSchema),
  depositPercent: z.number().min(0).max(100).nullable(),
  expirationDate: z.string().nullable(),
  paymentTerms: z.string().default("Prepaid"),
  customerFacingNotes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export type QuoteDraftInput = z.infer<typeof quoteDraftSchema>;
