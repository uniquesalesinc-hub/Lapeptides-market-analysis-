import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import {
  describeReportFilters,
  parseProductSort,
  parseReportFilters,
  productLeaderboard,
  reportFilterOptions,
  type ProductLeaderboardRow,
  type ProductSort,
} from "@/lib/data/reports";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/format";
import { ReportShell } from "@/components/reports/ReportShell";
import { LeaderboardTable } from "@/components/reports/LeaderboardTable";

export const metadata = { title: "Product Reports | LA Peptides Sales Portal" };

type ReportSearchParams = {
  from?: string;
  to?: string;
  customerId?: string;
  repId?: string;
  priceList?: string;
  sort?: string;
};

/** Header link that toggles ?sort= while preserving every filter param. */
function SortHeader({
  label,
  sortKey,
  activeSort,
  sp,
}: {
  label: string;
  sortKey: ProductSort;
  activeSort: ProductSort;
  sp: ReportSearchParams;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== "sort") params.set(key, value);
  }
  params.set("sort", sortKey);
  const active = activeSort === sortKey;
  return (
    <Link
      href={`/reports/products?${params.toString()}`}
      aria-current={active ? "true" : undefined}
      className={active ? "font-semibold text-lap-teal" : "hover:text-lap-ink"}
    >
      {label}
      {active ? " ↓" : ""}
    </Link>
  );
}

export default async function ReportsProductsPage({
  searchParams,
}: {
  searchParams: Promise<ReportSearchParams>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseReportFilters(sp);
  const sort = parseProductSort(sp.sort);
  const [{ reps, customers }, rows] = await Promise.all([reportFilterOptions(), productLeaderboard(filters, sort)]);

  const context = describeReportFilters(filters, {
    repName: reps.find((r) => r.id === filters.repId)?.name,
    customerName: customers.find((c) => c.id === filters.customerId)?.name,
    priceListLabel: filters.priceListCode ? PRICE_LIST_LABELS[filters.priceListCode] : undefined,
  });

  const metric = (r: ProductLeaderboardRow) =>
    sort === "revenue" ? r.revenue : sort === "customers" ? r.distinctCustomers : r.qtySold;
  const maxMetric = Math.max(...rows.map(metric), 1);

  return (
    <ReportShell
      description="Top 25 sellers on confirmed orders. Click a column to rank by quantity, revenue, or reach."
      reps={reps}
      customers={customers}
    >
      <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
        <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
          Product leaderboard, {context}
        </h2>
        <LeaderboardTable<ProductLeaderboardRow>
          rows={rows}
          rowKey={(r) => r.key}
          emptyMessage="No confirmed order lines in this filter window yet."
          columns={[
            { key: "product", header: "Product", render: (r) => <span className="font-medium">{r.product}</span> },
            { key: "size", header: "Size", mono: true, render: (r) => r.size },
            {
              key: "qty",
              header: <SortHeader label="Qty sold" sortKey="qty" activeSort={sort} sp={sp} />,
              align: "right",
              mono: true,
              ...(sort === "qty" ? { barShare: (r: ProductLeaderboardRow) => r.qtySold / maxMetric } : {}),
              render: (r) => r.qtySold,
            },
            {
              key: "revenue",
              header: <SortHeader label="Revenue" sortKey="revenue" activeSort={sort} sp={sp} />,
              align: "right",
              mono: true,
              ...(sort === "revenue" ? { barShare: (r: ProductLeaderboardRow) => r.revenue / maxMetric } : {}),
              render: (r) => formatMoney(r.revenue),
            },
            {
              key: "customers",
              header: <SortHeader label="Customers" sortKey="customers" activeSort={sort} sp={sp} />,
              align: "right",
              mono: true,
              ...(sort === "customers" ? { barShare: (r: ProductLeaderboardRow) => r.distinctCustomers / maxMetric } : {}),
              render: (r) => r.distinctCustomers,
            },
          ]}
        />
      </section>
    </ReportShell>
  );
}
