const QUOTE_STYLES: Record<string, string> = {
  DRAFT: "border-brand-slate-400/40 bg-brand-slate-400/10 text-brand-slate-300",
  SENT: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  VIEWED: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  AWAITING_APPROVAL: "border-brand-warning/40 bg-brand-warning/10 text-brand-warning",
  APPROVED: "border-brand-success/40 bg-brand-success/10 text-brand-success",
  DECLINED: "border-brand-danger/40 bg-brand-danger/10 text-brand-danger",
  EXPIRED: "border-brand-danger/40 bg-brand-danger/10 text-brand-danger",
  CONVERTED_TO_INVOICE: "border-brand-teal/40 bg-brand-teal/10 text-brand-teal",
  CANCELLED: "border-brand-slate-400/40 bg-brand-slate-400/10 text-brand-slate-400",
  PARTIALLY_PAID: "border-brand-warning/40 bg-brand-warning/10 text-brand-warning",
  PAID: "border-brand-success/40 bg-brand-success/10 text-brand-success",
  OVERDUE: "border-brand-danger/40 bg-brand-danger/10 text-brand-danger",
  REFUNDED: "border-brand-slate-400/40 bg-brand-slate-400/10 text-brand-slate-400",
  VOIDED: "border-brand-slate-400/40 bg-brand-slate-400/10 text-brand-slate-400",
};

const LABELS: Record<string, string> = {
  AWAITING_APPROVAL: "Awaiting Approval",
  CONVERTED_TO_INVOICE: "Converted",
  PARTIALLY_PAID: "Partially Paid",
};

export function StatusBadge({ status }: { status: string }) {
  const style = QUOTE_STYLES[status] ?? "border-brand-border bg-brand-surfaceAlt text-brand-slate-300";
  const label = LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return <span className={`badge ${style}`}>{label}</span>;
}
