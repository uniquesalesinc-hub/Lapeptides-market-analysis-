import { requireUser } from "@/lib/session";
import { getRepSalesBreakdown, getSalesComparison } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/shell/PageHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { formatMoney } from "@/lib/format";
import { Chip } from "@/components/customers/chips";

export const metadata = { title: "Sales | LA Peptides Sales Portal" };

function changeChip(current: number, previous: number, money = false) {
  const delta = current - previous;
  const fmt = (n: number) => (money ? formatMoney(Math.abs(n)) : String(Math.abs(n)));
  if (delta > 0) return <Chip tone="green">up {fmt(delta)}</Chip>;
  if (delta < 0) return <Chip tone="amber">down {fmt(delta)}</Chip>;
  return <Chip tone="slate">no change</Chip>;
}

function ComparisonRow({
  label,
  current,
  previous,
  money = false,
}: {
  label: string;
  current: number;
  previous: number;
  money?: boolean;
}) {
  const fmt = (n: number) => (money ? formatMoney(n) : String(n));
  return (
    <tr className="transition-colors duration-150 hover:bg-lap-page">
      <td className="px-3 py-2.5 text-sm font-medium text-lap-ink">{label}</td>
      <td className="px-3 py-2.5 text-right font-mono text-sm text-lap-ink">{fmt(current)}</td>
      <td className="px-3 py-2.5 text-right font-mono text-sm text-lap-slate">{fmt(previous)}</td>
      <td className="px-3 py-2.5 text-right">{changeChip(current, previous, money)}</td>
    </tr>
  );
}

/** Sales tab: this month vs last for the viewer's scope; admins also get a per-rep table. */
export default async function DashboardSalesPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const [comparison, repRows] = await Promise.all([
    getSalesComparison({ id: user.id, role: user.role }),
    isAdmin ? getRepSalesBreakdown() : Promise.resolve(null),
  ]);

  const headerCell = "px-3 py-2 text-xs font-medium uppercase tracking-wide text-lap-slate";

  return (
    <div>
      <PageHeader
        title="Sales"
        description={
          isAdmin
            ? "Booked revenue and order volume across the whole team, this month against last."
            : "Your booked revenue and order volume, this month against last."
        }
      />
      <DashboardTabs isAdmin={isAdmin} />

      <div className="space-y-6">
        <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
          <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
            This month vs last {isAdmin ? "(all reps)" : "(your accounts)"}
          </h2>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-lap-teal-wash text-left">
                  <th className={`rounded-l-lg ${headerCell}`}>Measure</th>
                  <th className={`${headerCell} text-right`}>This month</th>
                  <th className={`${headerCell} text-right`}>Last month</th>
                  <th className={`rounded-r-lg ${headerCell} text-right`}>Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lap-border">
                <ComparisonRow
                  label="Booked revenue"
                  current={comparison.thisMonth.revenue}
                  previous={comparison.lastMonth.revenue}
                  money
                />
                <ComparisonRow
                  label="Confirmed orders"
                  current={comparison.thisMonth.orders}
                  previous={comparison.lastMonth.orders}
                />
                <ComparisonRow
                  label="Drafts"
                  current={comparison.thisMonth.drafts}
                  previous={comparison.lastMonth.drafts}
                />
              </tbody>
            </table>
          </div>
        </section>

        {repRows && (
          <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
            <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
              By representative, this month
            </h2>
            {repRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-lap-slate">
                No quotes booked or drafted this month yet.
              </p>
            ) : (
              <div className="overflow-x-auto p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-lap-teal-wash text-left">
                      <th className={`rounded-l-lg ${headerCell}`}>Representative</th>
                      <th className={`${headerCell} text-right`}>Revenue</th>
                      <th className={`${headerCell} text-right`}>Orders</th>
                      <th className={`rounded-r-lg ${headerCell} text-right`}>Drafts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-lap-border">
                    {repRows.map((r) => (
                      <tr key={r.repId} className="transition-colors duration-150 hover:bg-lap-page">
                        <td className="px-3 py-2.5 font-medium text-lap-ink">{r.repName}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-lap-ink">{formatMoney(r.revenue)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-lap-ink">{r.orders}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-lap-slate">{r.drafts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
