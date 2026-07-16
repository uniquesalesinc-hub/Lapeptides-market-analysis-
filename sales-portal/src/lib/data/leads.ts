import { prisma } from "@/lib/prisma";
import type { LeadReviewStatus, LeadSource } from "@prisma/client";
import type { QuoteLadderCode } from "@/components/quotes/wizard-types";

/**
 * Customer.paymentTerms is a pre-existing TEXT column shared with the live v1 portal
 * ("Prepaid" / "Net N" parsed by lib/invoiceTerms.computeDueDate). These are the only
 * values the UI exposes; the PaymentTerms Prisma enum is intentionally NOT used in app code.
 */
export const PAYMENT_TERMS_VALUES = ["Prepaid", "Net 15", "Net 30", "Net 60"] as const;
export type PaymentTermsValue = (typeof PAYMENT_TERMS_VALUES)[number];

// ---------------------------------------------------------------------------
// Pure logic (unit-tested in leads.test.ts — no Prisma)
// ---------------------------------------------------------------------------

export interface LeadMatchResult {
  type: "EXISTING" | "NEW";
  matchedCustomerId: string | null;
}

/**
 * Classifies an inbound lead as an existing-customer match or a genuinely new prospect.
 * EXISTING when a customer shares the lead's email domain (case-insensitive) OR has the
 * exact same company/business name (case-insensitive). Note: a shared free-mail domain
 * (e.g. gmail.com) will match here by design simplicity — the admin reviews every match
 * in the lead drawer before acting on it, so a false positive costs one glance.
 */
export function matchLeadType(
  lead: { email: string; company: string },
  customers: { id: string; email: string | null; businessName: string | null }[]
): LeadMatchResult {
  const leadDomain = lead.email.split("@")[1]?.toLowerCase() ?? "";
  const leadCompany = lead.company.trim().toLowerCase();

  for (const customer of customers) {
    const customerDomain = customer.email?.split("@")[1]?.toLowerCase() ?? "";
    const domainMatch = leadDomain.length > 0 && customerDomain === leadDomain;
    const companyMatch =
      leadCompany.length > 0 && customer.businessName?.trim().toLowerCase() === leadCompany;
    if (domainMatch || companyMatch) {
      return { type: "EXISTING", matchedCustomerId: customer.id };
    }
  }
  return { type: "NEW", matchedCustomerId: null };
}

export interface LeadDecisionInput {
  decision: "APPROVED" | "REJECTED";
  customerId?: string | null;
  reviewerId: string;
  now: Date;
}

export interface LeadDecisionPatch {
  status: "APPROVED" | "REJECTED";
  createdCustomerId: string | null;
  reviewedById: string;
  reviewedAt: Date;
}

/** Builds the Lead update payload for an admin decision. APPROVED must carry the customer it produced/linked. */
export function leadDecisionPatch({ decision, customerId, reviewerId, now }: LeadDecisionInput): LeadDecisionPatch {
  if (decision === "APPROVED" && !customerId) {
    throw new Error("An APPROVED decision requires the customerId it created or linked.");
  }
  return {
    status: decision,
    createdCustomerId: decision === "APPROVED" ? customerId! : null,
    reviewedById: reviewerId,
    reviewedAt: new Date(now),
  };
}

// ---------------------------------------------------------------------------
// Prisma wrappers
// ---------------------------------------------------------------------------

export async function listLeads(status?: LeadReviewStatus) {
  return prisma.lead.findMany({
    where: status ? { status } : {},
    include: {
      matchedCustomer: { select: { id: true, businessName: true } },
      createdCustomer: { select: { id: true, businessName: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export interface CreateLeadInput {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  source?: LeadSource;
}

/** Creates an OPEN lead, stamping matchedCustomerId when it looks like an existing account. */
export async function createLead(input: CreateLeadInput) {
  const customers = await prisma.customer.findMany({
    select: { id: true, email: true, businessName: true },
  });
  const match = matchLeadType({ email: input.email, company: input.company }, customers);

  return prisma.lead.create({
    data: {
      company: input.company,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone || null,
      message: input.message || null,
      source: input.source ?? "MANUAL",
      matchedCustomerId: match.matchedCustomerId,
    },
  });
}

export interface ApproveLeadInput {
  leadId: string;
  reviewerId: string;
  assignRepId: string;
  priceListCode: QuoteLadderCode;
  paymentTerms: PaymentTermsValue;
  existingCustomerId?: string | null;
}

/**
 * Approves a lead in one transaction: create a Customer from the lead's fields (or link the
 * chosen existing customer), then stamp the lead APPROVED with reviewer + created customer.
 */
export async function approveLead({
  leadId,
  reviewerId,
  assignRepId,
  priceListCode,
  paymentTerms,
  existingCustomerId,
}: ApproveLeadInput) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error("Lead not found.");
    if (lead.status !== "OPEN") throw new Error("This lead has already been reviewed.");

    let customerId = existingCustomerId || null;
    if (!customerId) {
      const customer = await tx.customer.create({
        data: {
          businessName: lead.company,
          contactName: `${lead.firstName} ${lead.lastName}`.trim(),
          email: lead.email,
          phone: lead.phone,
          defaultPriceListCode: priceListCode,
          paymentTerms,
          assignedRepId: assignRepId,
          internalNotes: lead.message ? `From lead (${lead.source}): ${lead.message}` : null,
        },
      });
      customerId = customer.id;
    }

    const updated = await tx.lead.update({
      where: { id: leadId },
      data: leadDecisionPatch({ decision: "APPROVED", customerId, reviewerId, now: new Date() }),
    });
    return { lead: updated, customerId };
  });
}

/** Marks a lead REJECTED with the reviewing admin. Never creates or links a customer. */
export async function rejectLead(leadId: string, reviewerId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found.");
  if (lead.status !== "OPEN") throw new Error("This lead has already been reviewed.");

  return prisma.lead.update({
    where: { id: leadId },
    data: leadDecisionPatch({ decision: "REJECTED", reviewerId, now: new Date() }),
  });
}
