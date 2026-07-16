import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getInvoiceById } from "@/lib/data/invoices";
import { displayInvoiceStatus } from "@/lib/data/invoiceStatus";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InvoiceDetailActions } from "@/components/invoices/InvoiceDetailActions";
import { InvoicePaymentForm } from "@/components/invoices/InvoicePaymentForm";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();
  if (user.role === "SALES_REP" && invoice.ownerId !== user.id) redirect("/invoices");

  const balanceDue = Number(invoice.balanceDue);
  const canRecordPayment = balanceDue > 0 && !["CANCELLED", "VOIDED", "REFUNDED"].includes(invoice.status);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-xl font-semibold text-lap-ink">{invoice.invoiceNumber}</h1>
          <StatusBadge status={displayInvoiceStatus(invoice)} />
        </div>
        <p className="text-sm text-lap-slate">
          {invoice.customer.businessName} · {formatDate(invoice.issueDate)}
        </p>
        {invoice.quote && (
          <Link href={`/quotes/${invoice.quote.id}`} className="text-sm text-lap-teal">
            View source quote {invoice.quote.quoteNumber} →
          </Link>
        )}
      </div>

      <InvoiceDetailActions
        invoiceId={invoice.id}
        status={invoice.status}
        isAdmin={user.role === "ADMIN"}
        hasPayments={invoice.payments.length > 0}
      />

      {canRecordPayment && <InvoicePaymentForm invoiceId={invoice.id} balanceDue={balanceDue} />}

      <div className="card p-4 text-sm">
        <p className="label-text !mb-1">Priced against</p>
        <p className="text-lap-ink">{PRICE_LIST_LABELS[invoice.priceListCode]}</p>
      </div>

      <div className="card divide-y divide-lap-border p-4">
        {invoice.lineItems.map((li) => (
          <div key={li.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium text-lap-ink">
                {li.productName} {li.strength}
              </p>
              <p className="font-mono text-xs text-lap-slate">{li.sku}</p>
              <p className="text-xs text-lap-slate">
                {li.quantity} × {formatMoney(Number(li.unitPrice))} · {li.pricingTierLabel}
              </p>
            </div>
            <p className="font-mono font-semibold text-lap-ink">{formatMoney(Number(li.lineTotal))}</p>
          </div>
        ))}
      </div>

      <div className="card space-y-1.5 p-4 text-sm">
        <Row label="Subtotal" value={formatMoney(Number(invoice.subtotal))} />
        {Number(invoice.discountTotal) !== 0 && <Row label="Discounts" value={formatMoney(Number(invoice.discountTotal))} />}
        {Number(invoice.feeTotal) !== 0 && <Row label="Fees" value={formatMoney(Number(invoice.feeTotal))} />}
        {Number(invoice.shippingTotal) !== 0 && <Row label="Shipping" value={formatMoney(Number(invoice.shippingTotal))} />}
        {Number(invoice.taxTotal) !== 0 && <Row label="Tax" value={formatMoney(Number(invoice.taxTotal))} />}
        <div className="border-t border-lap-border pt-1.5">
          <Row label="Total" value={formatMoney(Number(invoice.grandTotal))} bold />
        </div>
        <Row label="Amount paid" value={formatMoney(Number(invoice.amountPaid))} />
        <Row label="Balance due" value={formatMoney(balanceDue)} bold />
      </div>

      {invoice.payments.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-lap-ink">Payment History</h2>
          <ul className="space-y-2">
            {invoice.payments.map((p) => (
              <li key={p.id} className="card flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-mono text-lap-ink">{formatMoney(Number(p.amount))}</p>
                  <p className="text-xs text-lap-slate">
                    {p.method.replace(/_/g, " ")} · {formatDateTime(p.paidAt)}
                  </p>
                  {p.referenceNote && <p className="text-xs text-lap-slate">Ref: {p.referenceNote}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {invoice.achInstructions && (
        <div className="card p-4 text-sm">
          <p className="label-text !mb-1">ACH Instructions</p>
          <p className="text-lap-slate">{invoice.achInstructions}</p>
        </div>
      )}

      {invoice.internalNotes && (
        <div className="card border-lap-amber/40 p-4 text-sm">
          <p className="label-text !mb-1">Internal notes</p>
          <p className="text-lap-slate">{invoice.internalNotes}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-lap-ink" : "text-lap-slate"}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
