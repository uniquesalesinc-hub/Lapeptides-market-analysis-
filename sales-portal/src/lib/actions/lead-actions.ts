"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { approveLead, createLead, rejectLead } from "@/lib/data/leads";
import { approveLeadSchema, createLeadSchema, rejectLeadSchema } from "@/lib/validation/crm";

export interface LeadActionResult {
  ok: boolean;
  error?: string;
  leadId?: string;
  customerId?: string;
}

function revalidateLeadViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
}

/**
 * Decision notifications are fire-and-forget: sendEmail already returns an honest
 * `sent:false` when RESEND_API_KEY is missing, and a delivery failure must never
 * roll back or fail an approval/rejection that is already committed.
 */
function notifyLead(to: string, subject: string, html: string) {
  void sendEmail({ to, subject, html }).catch((err) => {
    console.error("[lead:notify-failed]", err);
  });
}

export async function createLeadAction(input: unknown): Promise<LeadActionResult> {
  await requireAdmin();

  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid lead." };
  }

  try {
    const lead = await createLead({
      company: parsed.data.company,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
      source: parsed.data.source,
    });

    revalidateLeadViews();
    return { ok: true, leadId: lead.id };
  } catch (err) {
    console.error("[lead:create-failed]", err);
    return { ok: false, error: "Could not create the lead. Please try again." };
  }
}

export async function approveLeadAction(input: unknown): Promise<LeadActionResult> {
  const admin = await requireAdmin();

  const parsed = approveLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid approval." };
  }

  try {
    const { lead, customerId } = await approveLead({
      leadId: parsed.data.leadId,
      reviewerId: admin.id,
      assignRepId: parsed.data.assignRepId,
      priceListCode: parsed.data.priceListCode,
      paymentTerms: parsed.data.paymentTerms,
      existingCustomerId: parsed.data.existingCustomerId,
    });

    notifyLead(
      lead.email,
      "Your LA Peptides wholesale account is approved",
      `<p>Hi ${lead.firstName},</p>
       <p>Your account request for ${lead.company} has been approved. Your sales representative will reach out shortly to get your first order set up.</p>
       <p>LA Peptides</p>`
    );

    revalidateLeadViews();
    revalidatePath("/customers");
    return { ok: true, leadId: lead.id, customerId };
  } catch (err) {
    console.error("[lead:approve-failed]", err);
    const message = err instanceof Error ? err.message : "Could not approve the lead.";
    return { ok: false, error: message };
  }
}

export async function rejectLeadAction(input: unknown): Promise<LeadActionResult> {
  const admin = await requireAdmin();

  const parsed = rejectLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rejection." };
  }

  try {
    const lead = await rejectLead(parsed.data.leadId, admin.id);

    notifyLead(
      lead.email,
      "Update on your LA Peptides account request",
      `<p>Hi ${lead.firstName},</p>
       <p>Thank you for your interest in LA Peptides. After review, we are unable to open a wholesale account for ${lead.company} at this time.</p>
       <p>LA Peptides</p>`
    );

    revalidateLeadViews();
    return { ok: true, leadId: lead.id };
  } catch (err) {
    console.error("[lead:reject-failed]", err);
    const message = err instanceof Error ? err.message : "Could not reject the lead.";
    return { ok: false, error: message };
  }
}
