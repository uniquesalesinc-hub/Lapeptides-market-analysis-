import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getRepDashboard, getAdminDashboard } from "@/lib/data/dashboard";
import { StatTile } from "@/components/dashboard/StatTile";
import { formatDate, formatMoney } from "@/lib/format";
import { ACTIVITY_LABELS } from "@/lib/data/activityLabels";

export default async function DashboardPage() {
  const user = await requireUser();
  const rep = await getRepDashboard(user.id);
  const admin = user.role === "ADMIN" ? await getAdminDashboard() : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Welcome back, {user.name?.split(" ")[0]}</h1>
        <Link href="/quotes/new" className="btn-primary mt-3 flex w-full items-center justify-center">
          + Create New Quote
        </Link>
      </div>

      <section>
        <h2 className="mb-2 font-semibold text-white">Your Activity</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Quotes this month" value={rep.quotesThisMonth} />
          <StatTile label="Open quotes" value={rep.openQuotes} />
          <StatTile label="Awaiting approval" value={rep.awaitingApproval} tone="warning" />
          <StatTile label="Invoices this month" value={rep.invoicesThisMonth} />
        </div>
      </section>

      {rep.expiringQuotes.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-white">Expiring Quotes</h2>
          <ul className="space-y-2">
            {rep.expiringQuotes.map((q) => (
              <li key={q.id}>
                <Link href={`/quotes/${q.id}`} className="card flex items-center justify-between p-3">
                  <span className="text-sm text-white">
                    {q.quoteNumber} · {q.customer.businessName}
                  </span>
                  <span className="text-xs text-brand-warning">Expires {formatDate(q.expirationDate)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rep.unpaidInvoices.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-white">Unpaid Invoices ({formatMoney(rep.unpaidTotal)})</h2>
          <ul className="space-y-2">
            {rep.unpaidInvoices.slice(0, 5).map((inv) => (
              <li key={inv.id}>
                <Link href={`/invoices/${inv.id}`} className="card flex items-center justify-between p-3">
                  <span className="text-sm text-white">
                    {inv.invoiceNumber} · {inv.customer.businessName}
                  </span>
                  <span className="text-xs text-brand-slate-400">{formatMoney(Number(inv.balanceDue))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rep.followUpsDue.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-white">Follow-ups Due</h2>
          <ul className="space-y-2">
            {rep.followUpsDue.map((c) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="card flex items-center justify-between p-3">
                  <span className="text-sm text-white">{c.businessName}</span>
                  <span className="text-xs text-brand-warning">{formatDate(c.followUpDate)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rep.recentCustomers.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-white">Recently Viewed Customers</h2>
          <div className="table-scroll">
            <div className="flex gap-2">
              {rep.recentCustomers.map((c) => (
                <Link key={c.id} href={`/customers/${c.id}`} className="card min-w-[140px] p-3">
                  <p className="text-sm font-medium text-white">{c.businessName}</p>
                  <p className="text-xs text-brand-slate-400">{c.contactName}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {rep.recentActivity.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-white">Recent Activity</h2>
          <ul className="card divide-y divide-brand-border p-4">
            {rep.recentActivity.map((a) => (
              <li key={a.id} className="py-2 text-sm first:pt-0 last:pb-0">
                <p className="text-white">{ACTIVITY_LABELS[a.action]}</p>
                <p className="text-xs text-brand-slate-400">
                  {a.customer?.businessName ?? a.quote?.quoteNumber ?? a.invoice?.invoiceNumber ?? ""} ·{" "}
                  {formatDate(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {admin && (
        <section className="space-y-3 border-t border-brand-border pt-6">
          <h2 className="font-semibold text-white">Company Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Total quoted revenue" value={formatMoney(admin.quotedRevenue)} />
            <StatTile label="Total invoiced revenue" value={formatMoney(admin.invoicedRevenue)} />
            <StatTile label="Quote conversion rate" value={`${admin.conversionRate.toFixed(1)}%`} />
            <StatTile label="Outstanding invoices" value={formatMoney(admin.outstandingTotal)} tone="warning" />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-brand-slate-300">Sales by Representative</h3>
            <ul className="card divide-y divide-brand-border p-4">
              {admin.salesByRep.map((r) => (
                <li key={r.repId} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                  <span className="text-white">{r.repName}</span>
                  <span className="text-brand-slate-300">
                    {formatMoney(r.total)} · {r.count} quotes
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-brand-slate-300">Top Products (by quoted value)</h3>
            <ul className="card divide-y divide-brand-border p-4">
              {admin.topProducts.map((p) => (
                <li key={p.productName} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                  <span className="text-white">{p.productName}</span>
                  <span className="text-brand-slate-300">
                    {formatMoney(p.total)} · {p.quantity} units
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-brand-slate-300">Recently Created Accounts</h3>
            <ul className="card divide-y divide-brand-border p-4">
              {admin.recentAccounts.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                  <Link href={`/customers/${c.id}`} className="text-white">
                    {c.businessName}
                  </Link>
                  <span className="text-brand-slate-400">{c.assignedRep.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
