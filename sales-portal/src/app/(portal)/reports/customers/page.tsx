import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import {
  customerLeaderboard,
  describeReportFilters,
  parseReportFilters,
  reportFilterOptions,
  type CustomerLeaderboardRow,
} from "@/lib/data/reports";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { formatDate, formatMoney } from "@/lib/format";
import { ReportShell } from "@/components/reports/ReportShell";
import { LeaderboardTable } from "@/components/reports/LeaderboardTable";

export const metadata = { title: "Customer Reports | LA Peptides Sales Portal" };

export default async function ReportsCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; customerId?: string; repId?: string; priceList?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseReportFilters(sp);
  const [{ reps, customers }, rows] = await Promise.all([reportFilterOptions(), customerLeaderboard(filters)]);

  const context = describeReportFilters(filters, {
    repName: reps.find((r) => r.id === filters.repId)?.name,
    customerName: customers.find((c) => c.id === filters.customerId)?.name,
    priceListLabel: filters.priceListCode ? PRICE_LIST_LABELS[filters.priceListCode] : undefined,
  });

  const maxAmount = Math.max(...rows.map((r) => r.orderAmount), 1);

  return (
    <ReportShell
      description="Top 25 customers by confirmed order amount, with reorder rhythm for accounts with 3+ orders."
      reps={reps}
      customers={customers}
    >
      <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
        <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
          Customer leaderboard, {context}
        </h2>
        <LeaderboardTable<CustomerLeaderboardRow>
          rows={rows}
          rowKey={(r) => r.customerId}
          emptyMessage="No confirmed orders in this filter window yet."
          columns={[
            {
              key: "customer",
              header: "Customer",
              render: (r) => (
                <Link href={`/customers/${r.customerId}`} className="font-medium text-lap-teal hover:underline">
                  {r.customerName}
                </Link>
              ),
            },
            { key: "orders", header: "Orders", align: "right", mono: true, render: (r) => r.orderCount },
            {
              key: "amount",
              header: "Order amount",
              align: "right",
              mono: true,
              barShare: (r) => r.orderAmount / maxAmount,
              render: (r) => formatMoney(r.orderAmount),
            },
            { key: "last", header: "Last order", align: "right", render: (r) => formatDate(r.lastOrderAt) },
            {
              key: "reorder",
              header: "Avg reorder days",
              align: "right",
              mono: true,
              render: (r) => (r.avgReorderDays === null ? <span className="text-lap-slate">n/a</span> : r.avgReorderDays),
            },
          ]}
        />
      </section>
    </ReportShell>
  );
}
