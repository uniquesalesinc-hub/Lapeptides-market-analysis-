/**
 * Computes an invoice's due date from its payment terms. "Prepaid" (and anything unrecognized,
 * defensively) is due immediately. "Net N" terms — the only other options exposed in the UI
 * (ChargesStep.tsx, SettingsForm.tsx) — are due N days after the given issue date. Returning a
 * real due date for Net terms (rather than null) is required for displayInvoiceStatus() to ever
 * be able to flag a Net-terms invoice as overdue.
 */
export function computeDueDate(paymentTerms: string | null | undefined, fromDate: Date = new Date()): Date {
  const match = paymentTerms?.match(/^Net\s+(\d+)$/i);
  if (!match) return new Date(fromDate);
  const days = Number(match[1]);
  const due = new Date(fromDate);
  due.setDate(due.getDate() + days);
  return due;
}
