import { z } from "zod";

// Same light phone check as validation/crm.ts and validation/customer.ts.
const phoneRegex = /^[0-9()+\-.\s]{7,20}$/;

export const clientLoginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  /** Optional post-login destination; the action only follows store-internal paths. */
  from: z.string().optional(),
});

/**
 * Public storefront account request. Creates a WEBSITE-source Lead for admin review;
 * it never creates a PortalUser or any credentials.
 */
export const clientSignupSchema = z.object({
  company: z.string().min(2, "Company name is required."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Enter a valid email address."),
  phone: z
    .union([z.string().regex(phoneRegex, "Enter a valid phone number."), z.literal("")])
    .optional(),
  message: z.string().max(2000, "Keep the message under 2000 characters.").optional(),
});

export type ClientLoginValues = z.infer<typeof clientLoginSchema>;
export type ClientSignupValues = z.infer<typeof clientSignupSchema>;
