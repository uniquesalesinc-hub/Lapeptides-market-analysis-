// Shared lap-token status chips for the Customer 360 surfaces. No hooks, so these render
// fine from both server and client components. Full-round per DESIGN.md; approval-ish
// states are amber with explicit words, never icon-only.

const CHIP_BASE =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

const TONE_CLASSES = {
  slate: "border-lap-border bg-lap-page text-lap-slate",
  teal: "border-lap-teal/30 bg-lap-teal-wash text-lap-teal",
  amber: "border-lap-amber/40 bg-lap-amber/10 text-[#9A6318]",
  green: "border-lap-green/40 bg-lap-green/10 text-lap-green",
  red: "border-lap-red/40 bg-lap-red/10 text-lap-red",
} as const;

export type ChipTone = keyof typeof TONE_CLASSES;

export function Chip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  return <span className={`${CHIP_BASE} ${TONE_CLASSES[tone]}`}>{children}</span>;
}

const CRM_STATUS: Record<string, { tone: ChipTone; label: string }> = {
  LEAD: { tone: "amber", label: "Lead" },
  ACTIVE: { tone: "green", label: "Active" },
  DORMANT: { tone: "slate", label: "Dormant" },
};

export function CrmStatusChip({ status }: { status: string }) {
  const entry = CRM_STATUS[status] ?? { tone: "slate" as ChipTone, label: status };
  return <Chip tone={entry.tone}>{entry.label}</Chip>;
}

const DOC_STATUS_TONES: Record<string, ChipTone> = {
  DRAFT: "slate",
  SENT: "teal",
  VIEWED: "teal",
  AWAITING_APPROVAL: "amber",
  APPROVED: "green",
  DECLINED: "red",
  EXPIRED: "red",
  CONVERTED_TO_INVOICE: "teal",
  CANCELLED: "slate",
  PARTIALLY_PAID: "amber",
  PAID: "green",
  OVERDUE: "red",
  REFUNDED: "slate",
  VOIDED: "slate",
  OPEN: "teal",
  DONE: "green",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  AWAITING_APPROVAL: "Awaiting approval",
  CONVERTED_TO_INVOICE: "Converted",
  PARTIALLY_PAID: "Partially paid",
};

export function DocStatusChip({ status }: { status: string }) {
  const label =
    DOC_STATUS_LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return <Chip tone={DOC_STATUS_TONES[status] ?? "slate"}>{label}</Chip>;
}
