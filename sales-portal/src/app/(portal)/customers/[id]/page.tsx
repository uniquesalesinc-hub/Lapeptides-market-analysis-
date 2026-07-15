import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getCustomerById } from "@/lib/data/customers";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();
  if (user.role === "SALES_REP" && customer.assignedRepId !== user.id) redirect("/customers");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{customer.businessName}</h1>
          <p className="text-sm text-brand-slate-400">
            {customer.contactName} · {customer.assignedRep.name}
          </p>
        </div>
        <Link href={`/customers/${customer.id}/edit`} className="btn-secondary !min-h-0 !px-4 !py-2 text-sm">
          Edit
        </Link>
      </div>

      <div className="card grid grid-cols-2 gap-4 p-4 text-sm">
        <div>
          <p className="label-text !mb-0">Email</p>
          <p className="text-white">{customer.email || "—"}</p>
        </div>
        <div>
          <p className="label-text !mb-0">Phone</p>
          <p className="text-white">{customer.phone || "—"}</p>
        </div>
        <div>
          <p className="label-text !mb-0">Customer type</p>
          <p className="text-white">{customer.customerType.replace(/_/g, " ")}</p>
        </div>
        <div>
          <p className="label-text !mb-0">Price list</p>
          <p className="text-white">{customer.defaultPriceListCode.replace(/_/g, " ")}</p>
        </div>
        <div>
          <p className="label-text !mb-0">Payment terms</p>
          <p className="text-white">{customer.paymentTerms}</p>
        </div>
        <div>
          <p className="label-text !mb-0">Tax-exempt</p>
          <p className="text-white">{customer.taxExempt ? "Yes" : "No"}</p>
        </div>
        <div>
          <p className="label-text !mb-0">Last contact</p>
          <p className="text-white">{formatDate(customer.lastContactDate)}</p>
        </div>
        <div>
          <p className="label-text !mb-0">Follow-up</p>
          <p className={customer.followUpDate ? "text-brand-warning" : "text-white"}>
            {formatDate(customer.followUpDate)}
          </p>
        </div>
      </div>

      {customer.customerFacingNotes && (
        <div className="card p-4">
          <p className="label-text !mb-1">Customer-facing notes</p>
          <p className="text-sm text-brand-slate-200">{customer.customerFacingNotes}</p>
        </div>
      )}
      {customer.internalNotes && (
        <div className="card border-brand-warning/30 p-4">
          <p className="label-text !mb-1">Internal notes (never shown to customer)</p>
          <p className="text-sm text-brand-slate-200">{customer.internalNotes}</p>
        </div>
      )}

      <Link
        href={`/quotes/new?customerId=${customer.id}`}
        className="btn-primary flex w-full items-center justify-center"
      >
        Create Quote for {customer.businessName}
      </Link>

      <section>
        <h2 className="mb-2 font-semibold text-white">Quote History</h2>
        {customer.quotes.length === 0 ? (
          <p className="text-sm text-brand-slate-400">No quotes yet.</p>
        ) : (
          <ul className="space-y-2">
            {customer.quotes.map((q) => (
              <li key={q.id}>
                <Link href={`/quotes/${q.id}`} className="card flex items-center justify-between p-3">
                  <div>
                    <p className="font-mono text-sm text-white">{q.quoteNumber}</p>
                    <p className="text-xs text-brand-slate-400">{formatDate(q.quoteDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatMoney(Number(q.grandTotal))}</p>
                    <StatusBadge status={q.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-white">Invoice History</h2>
        {customer.invoices.length === 0 ? (
          <p className="text-sm text-brand-slate-400">No invoices yet.</p>
        ) : (
          <ul className="space-y-2">
            {customer.invoices.map((inv) => (
              <li key={inv.id}>
                <Link href={`/invoices/${inv.id}`} className="card flex items-center justify-between p-3">
                  <div>
                    <p className="font-mono text-sm text-white">{inv.invoiceNumber}</p>
                    <p className="text-xs text-brand-slate-400">{formatDate(inv.issueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatMoney(Number(inv.grandTotal))}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
