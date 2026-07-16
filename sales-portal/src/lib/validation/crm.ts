import { z } from "zod";
import { PAYMENT_TERMS_VALUES } from "@/lib/data/leads";

// Same light phone check as validation/customer.ts — reps enter numbers in many formats.
const phoneRegex = /^[0-9()+\-.\s]{7,20}$/;

export const logActivitySchema = z.object({
  type: z.enum(["CALL", "EMAIL", "VISIT", "MEETING", "NOTE"]),
  customerId: z.string().min(1, "Select a customer."),
  note: z.string().min(1, "Add a note."),
  occurredAt: z.coerce.date().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(2, "Give the task a title."),
  note: z.string().optional(),
  customerId: z.string().optional(),
  // Defaults to the acting user in the action layer; only admins may set someone else.
  assigneeId: z.string().optional(),
  dueDate: z.coerce.date({ errorMap: () => ({ message: "Set a due date." }) }),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  source: z.enum(["MANUAL", "REORDER_RADAR", "ABANDONED_CART"]).default("MANUAL"),
});

export const createLeadSchema = z.object({
  company: z.string().min(2, "Company name is required."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Enter a valid email address."),
  phone: z
    .union([z.string().regex(phoneRegex, "Enter a valid phone number."), z.literal("")])
    .optional(),
  message: z.string().optional(),
  source: z.enum(["MANUAL", "WEBSITE"]).default("MANUAL"),
});

export const approveLeadSchema = z.object({
  leadId: z.string().min(1),
  assignRepId: z.string().min(1, "Assign a sales representative."),
  // Bulk ladders only — the QuoteLadderCode subset, matching Customer.defaultPriceListCode usage.
  priceListCode: z.enum(["BULK_RETAIL", "BULK_WHOLESALE"]),
  // Customer.paymentTerms is the existing text column ("Prepaid" / "Net N"), NOT the Prisma enum.
  paymentTerms: z.enum(PAYMENT_TERMS_VALUES),
  existingCustomerId: z.string().optional(),
});

export const rejectLeadSchema = z.object({
  leadId: z.string().min(1),
});

export type LogActivityValues = z.infer<typeof logActivitySchema>;
export type CreateTaskValues = z.infer<typeof createTaskSchema>;
export type CreateLeadValues = z.infer<typeof createLeadSchema>;
export type ApproveLeadValues = z.infer<typeof approveLeadSchema>;
export type RejectLeadValues = z.infer<typeof rejectLeadSchema>;
