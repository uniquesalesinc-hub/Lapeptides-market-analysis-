import { formatDate, formatMoney } from "@/lib/format";

export interface CustomerStatsData {
  totalRevenue: number;
  orderCount: number;
  quoteCount: number;
  samplesSent: number;
  openDraftCount: number;
  lastOrderDate: Date | null;
}

function StatRow({
  label,
  context,
  value,
}: {
  label: string;
  context: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-lap-ink">{label}</p>
        <p className="text-xs text-lap-slate">{context}</p>
      </div>
      <p className="shrink-0 font-mono text-lg font-semibold text-lap-ink">{value}</p>
    </div>
  );
}

/**
 * One stat table-card: each number sits in a row next to its context (per DESIGN.md,
 * no floating KPI tiles). Revenue counts every non-cancelled invoice for this account.
 */
export function CustomerStats({ stats }: { stats: CustomerStatsData }) {
  const lastOrder = stats.lastOrderDate ? `last order ${formatDate(stats.lastOrderDate)}` : "no orders yet";

  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
      <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
        Account performance
      </h2>
      <div className="divide-y divide-lap-border">
        <StatRow
          label="Total revenue"
          context="invoiced, excluding cancelled"
          value={formatMoney(stats.totalRevenue)}
        />
        <StatRow label="Orders" context={lastOrder} value={String(stats.orderCount)} />
        <StatRow label="Quotes" context="all statuses, all time" value={String(stats.quoteCount)} />
        <StatRow
          label="Samples sent"
          context="free units on sent quotes and orders"
          value={String(stats.samplesSent)}
        />
        <StatRow
          label="Open drafts"
          context="quotes not yet sent or accepted"
          value={String(stats.openDraftCount)}
        />
      </div>
    </section>
  );
}
