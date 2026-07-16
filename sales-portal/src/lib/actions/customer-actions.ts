"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import { customerSchema } from "@/lib/validation/customer";
import { findPossibleDuplicates } from "@/lib/data/customers";
import { PAYMENT_TERMS_VALUES } from "@/lib/data/leads";

function formToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "shippingSameAsBilling" || key === "taxExempt") {
      obj[key] = value === "on" || value === "true";
    } else {
      obj[key] = value;
    }
  }
  // Checkbox fields are absent from FormData entirely when unchecked.
  if (!("shippingSameAsBilling" in obj)) obj.shippingSameAsBilling = false;
  if (!("taxExempt" in obj)) obj.taxExempt = false;
  return obj;
}

export interface CustomerActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  duplicates?: Array<{ id: string; businessName: string; email: string | null; contactName: string }>;
  customerId?: string;
  customer?: {
    id: string;
    businessName: string;
    contactName: string;
    email: string | null;
    defaultPriceListCode: string;
    paymentTerms: string;
  };
}

export async function createCustomer(
  _prev: CustomerActionResult,
  formData: FormData
): Promise<CustomerActionResult> {
  const user = await requireUser();
  const raw = formToObject(formData);
  const confirmDuplicate = formData.get("confirmDuplicate") === "true";
  const isProspect = formData.get("isProspect") === "true";

  // Reps may only assign their own customers; admins can assign to any rep via the form.
  if (user.role === "SALES_REP") raw.assignedRepId = user.id;

  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  if (!confirmDuplicate) {
    const duplicates = await findPossibleDuplicates(parsed.data.businessName, parsed.data.email);
    if (duplicates.length > 0) {
      return {
        ok: false,
        message: "A similar customer may already exist. Review before creating a new record.",
        duplicates,
      };
    }
  }

  const data = parsed.data;
  const customer = await prisma.customer.create({
    data: {
      businessName: data.businessName,
      contactName: data.contactName,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      customerType: data.customerType,
      defaultPriceListCode: data.defaultPriceListCode,
      billingAddressLine1: data.billingAddressLine1 || null,
      billingAddressLine2: data.billingAddressLine2 || null,
      billingCity: data.billingCity || null,
      billingState: data.billingState || null,
      billingPostalCode: data.billingPostalCode || null,
      shippingSameAsBilling: data.shippingSameAsBilling,
      shippingAddressLine1: data.shippingSameAsBilling ? null : data.shippingAddressLine1 || null,
      shippingAddressLine2: data.shippingSameAsBilling ? null : data.shippingAddressLine2 || null,
      shippingCity: data.shippingSameAsBilling ? null : data.shippingCity || null,
      shippingState: data.shippingSameAsBilling ? null : data.shippingState || null,
      shippingPostalCode: data.shippingSameAsBilling ? null : data.shippingPostalCode || null,
      taxExempt: data.taxExempt,
      taxIdOrExemptionNotes: data.taxIdOrExemptionNotes || null,
      paymentTerms: data.paymentTerms,
      internalNotes: data.internalNotes || null,
      customerFacingNotes: data.customerFacingNotes || null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      assignedRepId: data.assignedRepId,
      isProspect,
      lastContactDate: new Date(),
    },
    // Explicit select: the schema declares Phase-1 CRM columns (crmStatus etc.) the shared
    // DB may not have yet; the default RETURNING-all would fail on them. Only the fields the
    // code below actually uses are read back.
    select: { id: true, businessName: true, contactName: true, email: true, defaultPriceListCode: true, paymentTerms: true },
  });

  await prisma.activityLog.create({
    data: {
      action: "CUSTOMER_CREATED",
      actorId: user.id,
      customerId: customer.id,
      description: `${customer.businessName} created by ${user.name}`,
    },
  });

  revalidatePath("/customers");
  return {
    ok: true,
    customerId: customer.id,
    customer: {
      id: customer.id,
      businessName: customer.businessName,
      contactName: customer.contactName,
      email: customer.email,
      defaultPriceListCode: customer.defaultPriceListCode,
      paymentTerms: customer.paymentTerms,
    },
  };
}

export async function updateCustomer(
  customerId: string,
  _prev: CustomerActionResult,
  formData: FormData
): Promise<CustomerActionResult> {
  const user = await requireUser();
  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing) return { ok: false, message: "Customer not found." };
  if (user.role === "SALES_REP" && existing.assignedRepId !== user.id) {
    return { ok: false, message: "You do not have access to this customer." };
  }

  const raw = formToObject(formData);
  if (user.role === "SALES_REP") raw.assignedRepId = existing.assignedRepId;
  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      businessName: data.businessName,
      contactName: data.contactName,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      customerType: data.customerType,
      defaultPriceListCode: data.defaultPriceListCode,
      billingAddressLine1: data.billingAddressLine1 || null,
      billingAddressLine2: data.billingAddressLine2 || null,
      billingCity: data.billingCity || null,
      billingState: data.billingState || null,
      billingPostalCode: data.billingPostalCode || null,
      shippingSameAsBilling: data.shippingSameAsBilling,
      shippingAddressLine1: data.shippingSameAsBilling ? null : data.shippingAddressLine1 || null,
      shippingAddressLine2: data.shippingSameAsBilling ? null : data.shippingAddressLine2 || null,
      shippingCity: data.shippingSameAsBilling ? null : data.shippingCity || null,
      shippingState: data.shippingSameAsBilling ? null : data.shippingState || null,
      shippingPostalCode: data.shippingSameAsBilling ? null : data.shippingPostalCode || null,
      taxExempt: data.taxExempt,
      taxIdOrExemptionNotes: data.taxIdOrExemptionNotes || null,
      paymentTerms: data.paymentTerms,
      internalNotes: data.internalNotes || null,
      customerFacingNotes: data.customerFacingNotes || null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      assignedRepId: data.assignedRepId,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "CUSTOMER_EDITED",
      actorId: user.id,
      customerId,
      description: `${data.businessName} updated by ${user.name}`,
    },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, customerId };
}

export async function redirectToNewCustomer(customerId: string) {
  redirect(`/customers/${customerId}`);
}

// Commercial terms are admin territory: the price list and payment terms drive every price
// and due date the customer ever sees, so reps never get this mutation path.
const commercialsSchema = z.object({
  customerId: z.string().min(1),
  // Bulk ladders only - the same subset Customer.defaultPriceListCode uses everywhere else.
  defaultPriceListCode: z.enum(["BULK_RETAIL", "BULK_WHOLESALE"]),
  // TEXT column shared with live v1 ("Prepaid" / "Net N"), parsed by invoiceTerms.computeDueDate.
  paymentTerms: z.enum(PAYMENT_TERMS_VALUES),
  assignedRepId: z.string().min(1, "Assign a sales representative."),
  crmStatus: z.enum(["LEAD", "ACTIVE", "DORMANT"]),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
});

export interface CommercialsActionResult {
  ok: boolean;
  error?: string;
}

/** ADMIN ONLY: patch a customer's commercial settings from the Customer 360 controls card. */
export async function updateCustomerCommercials(input: unknown): Promise<CommercialsActionResult> {
  const admin = await requireAdmin();

  const parsed = commercialsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid commercial settings." };
  }
  const data = parsed.data;

  const existing = await prisma.customer.findUnique({
    where: { id: data.customerId },
    select: { id: true, businessName: true },
  });
  if (!existing) return { ok: false, error: "Customer not found." };

  const rep = await prisma.user.findUnique({ where: { id: data.assignedRepId }, select: { id: true } });
  if (!rep) return { ok: false, error: "Selected representative does not exist." };

  try {
    await prisma.customer.update({
      where: { id: data.customerId },
      data: {
        defaultPriceListCode: data.defaultPriceListCode,
        paymentTerms: data.paymentTerms,
        assignedRepId: data.assignedRepId,
        crmStatus: data.crmStatus,
        billingAddress: data.billingAddress?.trim() || null,
        shippingAddress: data.shippingAddress?.trim() || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "CUSTOMER_EDITED",
        actorId: admin.id,
        customerId: data.customerId,
        description: `${existing.businessName} commercial settings updated by ${admin.name}`,
      },
    });
  } catch (err) {
    console.error("[customer:commercials-failed]", err);
    return { ok: false, error: "Could not save the commercial settings. Please try again." };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${data.customerId}`);
  return { ok: true };
}
