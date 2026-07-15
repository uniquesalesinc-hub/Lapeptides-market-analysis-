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
});

export const quoteDraftSchema = z.object({
  quoteId: z.string().nullable(),
  customerId: z.string().min(1, "Select a customer."),
  priceListCode: z.enum(["BULK_RETAIL", "BULK_WHOLESALE", "WHOLESALE_SPRAYS", "WHOLESALE_CREAMS", "WHOLESALE_CAPSULES"]),
  lineItems: z.array(quoteLineInputSchema).min(1, "Add at least one product."),
  adjustments: z.array(adjustmentInputSchema),
  depositPercent: z.number().min(0).max(100).nullable(),
  expirationDate: z.string().nullable(),
  paymentTerms: z.string().default("Prepaid"),
  customerFacingNotes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export type QuoteDraftInput = z.infer<typeof quoteDraftSchema>;
