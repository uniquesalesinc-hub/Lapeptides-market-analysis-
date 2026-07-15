"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { customerSchema } from "@/lib/validation/customer";
import { findPossibleDuplicates } from "@/lib/data/customers";

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
