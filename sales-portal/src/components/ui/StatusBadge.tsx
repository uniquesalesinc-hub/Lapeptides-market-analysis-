// Lap-token status chips (DESIGN.md): approval-ish states are amber with explicit words,
// confirmed/paid green, overdue/declined red. Tone classes mirror src/components/customers/chips.tsx.
const TONE = {
  slate: "border-lap-border bg-lap-page text-lap-slate",
  teal: "border-lap-teal/30 bg-lap-teal-wash text-lap-teal",
  amber: "border-lap-amber/40 bg-lap-amber/10 text-[#9A6318]",
  green: "border-lap-green/40 bg-lap-green/10 text-lap-green",
  red: "border-lap-red/40 bg-lap-red/10 text-lap-red",
} as const;

const QUOTE_STYLES: Record<string, string> = {
  DRAFT: TONE.slate,
  SENT: TONE.teal,
  VIEWED: TONE.teal,
  AWAITING_APPROVAL: TONE.amber,
  APPROVED: TONE.green,
  DECLINED: TONE.red,
  EXPIRED: TONE.red,
  CONVERTED_TO_INVOICE: TONE.teal,
  CANCELLED: TONE.slate,
  PARTIALLY_PAID: TONE.amber,
  PAID: TONE.green,
  OVERDUE: TONE.red,
  REFUNDED: TONE.slate,
  VOIDED: TONE.slate,
};

const LABELS: Record<string, string> = {
  AWAITING_APPROVAL: "Awaiting approval",
  CONVERTED_TO_INVOICE: "Converted",
  PARTIALLY_PAID: "Partially paid",
};

export function StatusBadge({ status }: { status: string }) {
  const style = QUOTE_STYLES[status] ?? TONE.slate;
  const label = LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return <span className={`badge ${style}`}>{label}</span>;
}
