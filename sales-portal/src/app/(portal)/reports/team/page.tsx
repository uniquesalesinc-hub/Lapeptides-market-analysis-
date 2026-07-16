import { requireAdmin } from "@/lib/session";
import {
  describeReportFilters,
  parseReportFilters,
  reportFilterOptions,
  teamLeaderboard,
  type TeamLeaderboardRow,
} from "@/lib/data/reports";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/format";
import { ReportShell } from "@/components/reports/ReportShell";
import { LeaderboardTable } from "@/components/reports/LeaderboardTable";

export const metadata = { title: "Team Reports | LA Peptides Sales Portal" };

export default async function ReportsTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; customerId?: string; repId?: string; priceList?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseReportFilters(sp);
  const [{ reps, customers }, rows] = await Promise.all([reportFilterOptions(), teamLeaderboard(filters)]);

  const context = describeReportFilters(filters, {
    repName: reps.find((r) => r.id === filters.repId)?.name,
    customerName: customers.find((c) => c.id === filters.customerId)?.name,
    priceListLabel: filters.priceListCode ? PRICE_LIST_LABELS[filters.priceListCode] : undefined,
  });

  const maxRevenue = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <ReportShell
      description="Rep leaderboard: confirmed orders, revenue, conversion, and discount requests against approvals."
      reps={reps}
      customers={customers}
    >
      <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
        <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
          Team leaderboard, {context}
        </h2>
        <LeaderboardTable<TeamLeaderboardRow>
          rows={rows}
          rowKey={(r) => r.repId}
          emptyMessage="No rep activity in this filter window yet."
          columns={[
            { key: "rep", header: "Representative", render: (r) => <span className="font-medium">{r.repName}</span> },
            { key: "orders", header: "Confirmed orders", align: "right", mono: true, render: (r) => r.confirmedCount },
            {
              key: "revenue",
              header: "Revenue",
              align: "right",
              mono: true,
              barShare: (r) => r.revenue / maxRevenue,
              render: (r) => formatMoney(r.revenue),
            },
            {
              key: "conversion",
              header: "Conversion",
              align: "right",
              mono: true,
              render: (r) =>
                r.quoteConversion === null ? (
                  <span className="text-lap-slate">n/a</span>
                ) : (
                  `${r.quoteConversion.toFixed(1)}%`
                ),
            },
            { key: "samples", header: "Samples sent", align: "right", mono: true, render: (r) => (r.samplesSent > 0 ? r.samplesSent : "") },
            { key: "requests", header: "Discount requests", align: "right", mono: true, render: (r) => r.discountRequests },
            { key: "approvals", header: "Approved", align: "right", mono: true, render: (r) => r.discountApprovals },
          ]}
        />
      </section>
    </ReportShell>
  );
}
