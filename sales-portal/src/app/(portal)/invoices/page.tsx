import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listInvoices } from "@/lib/data/invoices";
import { displayInvoiceStatus } from "@/lib/data/invoiceStatus";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatMoney } from "@/lib/format";
import { InvoiceListFilters } from "@/components/invoices/InvoiceListFilters";
import type { InvoiceStatus } from "@prisma/client";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; unpaid?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const invoices = await listInvoices(user, {
    search: sp.q,
    status: sp.status as InvoiceStatus | undefined,
    unpaidOnly: sp.unpaid === "1",
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Invoices</h1>
      <InvoiceListFilters defaultSearch={sp.q} defaultStatus={sp.status} defaultUnpaid={sp.unpaid === "1"} />

      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Invoices appear here once a quote is converted or created directly." />
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li key={inv.id}>
              <Link href={`/invoices/${inv.id}`} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-mono text-sm text-white">{inv.invoiceNumber}</p>
                  <p className="text-sm text-brand-slate-400">{inv.customer.businessName}</p>
                  <p className="text-xs text-brand-slate-400">
                    {formatDate(inv.issueDate)} · {inv.owner.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="mb-1 font-semibold text-white">{formatMoney(Number(inv.balanceDue))} due</p>
                  <StatusBadge status={displayInvoiceStatus(inv)} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
