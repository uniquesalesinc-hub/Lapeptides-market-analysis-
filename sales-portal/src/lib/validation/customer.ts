import { z } from "zod";

// A light phone check rather than a strict format — reps enter numbers from many countries/formats.
const phoneRegex = /^[0-9()+\-.\s]{7,20}$/;

export const customerSchema = z.object({
  businessName: z.string().min(2, "Business name is required."),
  contactName: z.string().min(2, "Contact name is required."),
  email: z.union([z.string().email("Enter a valid email address."), z.literal("")]).optional(),
  phone: z
    .union([z.string().regex(phoneRegex, "Enter a valid phone number."), z.literal("")])
    .optional(),
  website: z.union([z.string().url("Enter a valid URL, including https://"), z.literal("")]).optional(),
  customerType: z.enum(["RESELLER", "DISTRIBUTOR", "CLINIC", "INDIVIDUAL_PRACTITIONER", "OTHER"]),
  defaultPriceListCode: z.enum(["BULK_RETAIL", "BULK_WHOLESALE", "WHOLESALE_SPRAYS", "WHOLESALE_CREAMS"]),

  billingAddressLine1: z.string().optional(),
  billingAddressLine2: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingPostalCode: z.string().optional(),

  shippingSameAsBilling: z.boolean().default(true),
  shippingAddressLine1: z.string().optional(),
  shippingAddressLine2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingPostalCode: z.string().optional(),

  taxExempt: z.boolean().default(false),
  taxIdOrExemptionNotes: z.string().optional(),
  paymentTerms: z.string().default("Prepaid"),
  internalNotes: z.string().optional(),
  customerFacingNotes: z.string().optional(),
  followUpDate: z.string().optional(),
  assignedRepId: z.string().min(1, "Assign a sales representative."),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
