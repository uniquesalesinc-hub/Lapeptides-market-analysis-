import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getQuoteById } from "@/lib/data/quotes";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QuoteDetailActions } from "@/components/quotes/QuoteDetailActions";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();
  if (user.role === "SALES_REP" && quote.ownerId !== user.id) redirect("/quotes");

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-xl font-semibold text-white">{quote.quoteNumber}</h1>
          <StatusBadge status={quote.status} />
        </div>
        <p className="text-sm text-brand-slate-400">
          {quote.customer.businessName} · {formatDate(quote.quoteDate)}
        </p>
        {quote.invoice && (
          <Link href={`/invoices/${quote.invoice.id}`} className="text-sm text-brand-teal">
            View invoice {quote.invoice.invoiceNumber} →
          </Link>
        )}
      </div>

      <QuoteDetailActions
        quoteId={quote.id}
        status={quote.status}
        publicToken={quote.publicToken}
        isConverted={quote.status === "CONVERTED_TO_INVOICE"}
      />

      <div className="card p-4 text-sm">
        <p className="label-text !mb-1">Priced against</p>
        <p className="text-white">{PRICE_LIST_LABELS[quote.priceListCode]}</p>
      </div>

      <div className="card divide-y divide-brand-border p-4">
        {quote.lineItems.map((li) => (
          <div key={li.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium text-white">
                {li.productName} {li.strength}
              </p>
              <p className="font-mono text-xs text-brand-slate-400">{li.sku}</p>
              <p className="text-xs text-brand-slate-400">
                {li.quantity} × {formatMoney(Number(li.unitPrice))} · {li.pricingTierLabel}
              </p>
            </div>
            <p className="font-semibold text-white">{formatMoney(Number(li.lineTotal))}</p>
          </div>
        ))}
      </div>

      <div className="card space-y-1.5 p-4 text-sm">
        <Row label="Subtotal" value={formatMoney(Number(quote.subtotal))} />
        {Number(quote.discountTotal) !== 0 && <Row label="Discounts" value={formatMoney(Number(quote.discountTotal))} />}
        {Number(quote.feeTotal) !== 0 && <Row label="Fees" value={formatMoney(Number(quote.feeTotal))} />}
        {Number(quote.shippingTotal) !== 0 && <Row label="Shipping" value={formatMoney(Number(quote.shippingTotal))} />}
        {Number(quote.taxTotal) !== 0 && <Row label="Tax" value={formatMoney(Number(quote.taxTotal))} />}
        <div className="border-t border-brand-border pt-1.5">
          <Row label="Total" value={formatMoney(Number(quote.grandTotal))} bold />
        </div>
        {Number(quote.depositRequired) > 0 && (
          <Row label="Deposit required" value={formatMoney(Number(quote.depositRequired))} />
        )}
      </div>

      {quote.adjustments.some((a) => a.requiresApproval && !a.approvedById) && (
        <p className="card border-brand-warning/40 p-4 text-sm text-brand-warning">
          This quote has discounts pending administrator approval and cannot be sent yet.
        </p>
      )}

      {quote.approvalRecord && (
        <div className="card p-4 text-sm">
          <p className="label-text !mb-1">Customer response</p>
          <p className="text-white">
            {quote.approvalRecord.decision === "APPROVED" ? "Approved" : "Declined"} by{" "}
            {quote.approvalRecord.respondentName}
            {quote.approvalRecord.respondentTitle ? `, ${quote.approvalRecord.respondentTitle}` : ""} on{" "}
            {formatDate(quote.approvalRecord.decidedAt)}
          </p>
          {quote.approvalRecord.comments && <p className="mt-1 text-brand-slate-300">&ldquo;{quote.approvalRecord.comments}&rdquo;</p>}
        </div>
      )}

      {quote.internalNotes && (
        <div className="card border-brand-warning/30 p-4 text-sm">
          <p className="label-text !mb-1">Internal notes</p>
          <p className="text-brand-slate-300">{quote.internalNotes}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-white" : "text-brand-slate-300"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
