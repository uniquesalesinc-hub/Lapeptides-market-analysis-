import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import {
  describeReportFilters,
  parseReportFilters,
  reportFilterOptions,
  salesReport,
  type MonthlySummaryRow,
} from "@/lib/data/reports";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/format";
import { ReportShell } from "@/components/reports/ReportShell";
import { LeaderboardTable } from "@/components/reports/LeaderboardTable";

export const metadata = { title: "Reports | LA Peptides Sales Portal" };

export default async function ReportsSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; customerId?: string; repId?: string; priceList?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseReportFilters(sp);
  const [{ reps, customers }, report] = await Promise.all([reportFilterOptions(), salesReport(filters)]);

  const context = describeReportFilters(filters, {
    repName: reps.find((r) => r.id === filters.repId)?.name,
    customerName: customers.find((c) => c.id === filters.customerId)?.name,
    priceListLabel: filters.priceListCode ? PRICE_LIST_LABELS[filters.priceListCode] : undefined,
  });

  const maxMonthAmount = Math.max(...report.monthly.map((m) => m.confirmedAmount), 1);

  return (
    <ReportShell
      description="Confirmed order totals, conversion, and month-by-month volume for the active filter window."
      actions={
        <Link href="/reports/activity" className="text-sm font-medium text-lap-teal hover:underline">
          Activity log
        </Link>
      }
      reps={reps}
      customers={customers}
    >
      <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
        <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
          Confirmed orders, {context}
        </h2>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-lap-border">
              <SummaryRow label="Confirmed order amount" value={formatMoney(report.confirmedAmount)} />
              <SummaryRow label="Confirmed orders" value={String(report.confirmedCount)} />
              <SummaryRow label="Average order value" value={formatMoney(report.averageOrderValue)} />
              <SummaryRow
                label="Quote conversion"
                value={`${report.quoteConversion.toFixed(1)}%`}
                note={`${report.confirmedCount} confirmed of ${report.nonDraftCount} non-draft quotes`}
              />
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
        <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
          By month, {context}
        </h2>
        <LeaderboardTable<MonthlySummaryRow>
          rows={report.monthly}
          rowKey={(m) => m.month}
          emptyMessage="No quotes in this filter window yet."
          columns={[
            { key: "month", header: "Month", render: (m) => <span className="font-medium">{m.month}</span> },
            { key: "quotes", header: "Quotes", align: "right", mono: true, render: (m) => m.totalQuotes },
            { key: "drafts", header: "Drafts", align: "right", mono: true, render: (m) => m.draftCount },
            { key: "confirmed", header: "Confirmed", align: "right", mono: true, render: (m) => m.confirmedCount },
            {
              key: "amount",
              header: "Confirmed amount",
              align: "right",
              mono: true,
              barShare: (m) => m.confirmedAmount / maxMonthAmount,
              render: (m) => formatMoney(m.confirmedAmount),
            },
          ]}
        />
      </section>
    </ReportShell>
  );
}

function SummaryRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <tr className="transition-colors duration-150 hover:bg-lap-page">
      <td className="px-3 py-2.5 text-sm font-medium text-lap-ink">
        {label}
        {note && <span className="block text-xs font-normal text-lap-slate">{note}</span>}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-sm text-lap-ink">{value}</td>
    </tr>
  );
}
