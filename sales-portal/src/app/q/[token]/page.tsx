import { notFound } from "next/navigation";
import { getPublicQuoteByToken } from "@/lib/data/publicQuote";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { Logo } from "@/components/brand/Logo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PublicApprovalForm } from "@/components/quotes/PublicApprovalForm";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await getPublicQuoteByToken(token);
  if (!quote) notFound();

  const settings = await prisma.companySettings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  const canRespond = !["APPROVED", "DECLINED", "EXPIRED", "CANCELLED", "CONVERTED_TO_INVOICE"].includes(quote.status);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <StatusBadge status={quote.status} />
      </div>

      <div className="card mb-4 p-4">
        <p className="font-mono text-sm text-lap-slate">{quote.quoteNumber}</p>
        <h1 className="font-heading text-xl font-semibold text-lap-ink">Quote for {quote.customer.businessName}</h1>
        <p className="mt-1 text-sm text-lap-slate">
          Prepared by {quote.owner.name} · {formatDate(quote.quoteDate)}
          {quote.expirationDate ? ` · Expires ${formatDate(quote.expirationDate)}` : ""}
        </p>
        <p className="mt-1 text-xs text-lap-slate">{PRICE_LIST_LABELS[quote.priceListCode]}</p>
      </div>

      <div className="mb-4">
        <a href={`/api/q/${token}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary w-full">
          Download PDF
        </a>
      </div>

      <div className="card mb-4 divide-y divide-lap-border p-4">
        {quote.lineItems.map((li) => (
          <div key={li.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium text-lap-ink">
                {li.productName} {li.strength}
              </p>
              <p className="text-xs text-lap-slate">
                {li.quantity} × {formatMoney(Number(li.unitPrice))}
              </p>
            </div>
            <p className="font-mono font-semibold text-lap-ink">{formatMoney(Number(li.lineTotal))}</p>
          </div>
        ))}
      </div>

      <div className="card mb-4 space-y-1.5 p-4 text-sm">
        <Row label="Subtotal" value={formatMoney(Number(quote.subtotal))} />
        {quote.adjustments.map((a) => (
          <Row key={a.id} label={a.label} value={formatMoney(Number(a.amount))} />
        ))}
        <div className="border-t border-lap-border pt-1.5">
          <Row label="Total" value={formatMoney(Number(quote.grandTotal))} bold />
        </div>
        {Number(quote.depositRequired) > 0 && <Row label="Deposit required" value={formatMoney(Number(quote.depositRequired))} />}
      </div>

      {quote.customerFacingNotes && (
        <div className="card mb-4 p-4 text-sm text-lap-slate">
          <p className="label-text !mb-1">Notes</p>
          <p>{quote.customerFacingNotes}</p>
        </div>
      )}

      {quote.termsAndConditions && (
        <div className="card mb-4 p-4 text-xs text-lap-slate">
          <p className="label-text !mb-1">Terms &amp; Conditions</p>
          <p>{quote.termsAndConditions}</p>
        </div>
      )}

      {quote.approvalRecord ? (
        <div className="card p-4 text-sm">
          <p className="font-semibold text-lap-ink">
            {quote.approvalRecord.decision === "APPROVED" ? "You approved this quote" : "You declined this quote"}
          </p>
          <p className="text-lap-slate">
            {quote.approvalRecord.respondentName} · {formatDate(quote.approvalRecord.decidedAt)}
          </p>
        </div>
      ) : canRespond ? (
        <PublicApprovalForm token={token} approvalLanguage={settings.customerApprovalLanguage ?? ""} />
      ) : (
        <div className="card p-4 text-center text-sm text-lap-slate">
          This quote is no longer awaiting a response.
        </div>
      )}
    </main>
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
