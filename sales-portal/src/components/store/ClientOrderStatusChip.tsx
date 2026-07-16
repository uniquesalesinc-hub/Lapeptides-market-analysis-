import type { QuoteStatus } from "@prisma/client";
import { clientOrderStatusLabel, clientOrderStatusTone } from "@/lib/clientOrder";

const TONE_CLASSES = {
  slate: "border-lap-border bg-lap-page text-lap-slate",
  teal: "border-lap-teal/30 bg-lap-teal-wash text-lap-teal",
  amber: "border-lap-amber/40 bg-lap-amber/10 text-[#9A6318]",
  green: "border-lap-green/40 bg-lap-green/10 text-lap-green",
  red: "border-lap-red/40 bg-lap-red/10 text-lap-red",
} as const;

/** Client-facing status chip for CLIENT-origin orders: explicit words, StatusBadge tones. */
export function ClientOrderStatusChip({ status }: { status: QuoteStatus }) {
  return (
    <span className={`badge ${TONE_CLASSES[clientOrderStatusTone(status)]}`} data-testid="client-order-status">
      {clientOrderStatusLabel(status)}
    </span>
  );
}
