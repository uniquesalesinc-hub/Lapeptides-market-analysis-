import { formatMoney } from "@/lib/format";
import type { DashboardHomeSummary } from "@/lib/data/dashboard";

function SummaryRow({ label, context, value }: { label: string; context: string; value: string }) {
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
 * Home summary as one table-card: every number sits beside its comparison context
 * (per DESIGN.md, never floating big-number tiles).
 */
export function KpiRow({ summary, scopeLabel }: { summary: DashboardHomeSummary; scopeLabel: string }) {
  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
      <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
        This month <span className="ml-1 text-sm font-normal text-lap-slate">{scopeLabel}</span>
      </h2>
      <div className="divide-y divide-lap-border">
        <SummaryRow
          label="Booked revenue"
          context={`last month ${formatMoney(summary.revenueLastMonth)}`}
          value={formatMoney(summary.revenueThisMonth)}
        />
        <SummaryRow
          label="Orders"
          context={`last month ${summary.ordersLastMonth}`}
          value={String(summary.ordersThisMonth)}
        />
        <SummaryRow
          label="Awaiting approval"
          context="open quotes waiting on management approval"
          value={String(summary.awaitingApproval)}
        />
        <SummaryRow
          label="Drafts"
          context="quotes not yet sent"
          value={String(summary.drafts)}
        />
      </div>
    </section>
  );
}
