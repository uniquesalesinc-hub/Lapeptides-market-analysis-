import type { InvoiceStatus } from "@prisma/client";

/**
 * "Overdue" is derived at read time from dueDate rather than stored and updated by a
 * background job (this app has no scheduler/cron infra). The persisted `status` stays
 * SENT/PARTIALLY_PAID until a payment or explicit action changes it; the UI shows "Overdue"
 * whenever that's true and the due date has passed.
 *
 * Prepaid invoices are due immediately on send, so a same-day payment (ACH/wire needs time to
 * clear) shouldn't instantly read as "Overdue" — a short grace window is applied for those.
 * Net-terms invoices use their explicit due date with no grace period.
 */
const PREPAID_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export function displayInvoiceStatus(invoice: {
  status: InvoiceStatus;
  dueDate: Date | null;
  paymentTerms?: string | null;
}): InvoiceStatus | "OVERDUE" {
  if ((invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID") && invoice.dueDate) {
    const graceMs = invoice.paymentTerms === "Prepaid" ? PREPAID_GRACE_PERIOD_MS : 0;
    if (invoice.dueDate.getTime() + graceMs < Date.now()) {
      return "OVERDUE";
    }
  }
  return invoice.status;
}
