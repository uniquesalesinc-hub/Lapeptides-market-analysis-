import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/clientSession";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ClientOrderStatusChip } from "@/components/store/ClientOrderStatusChip";
import { ReorderButton } from "@/components/store/ReorderButton";

export const metadata = { title: "Order | LA Peptides" };

/**
 * Client order confirmation / detail. Hard-scoped: the quote must belong to the session's
 * OWN customer and be CLIENT-origin, or this 404s - a portal user can never read another
 * account's orders (or internal rep-built quotes) by guessing ids. The origin and
 * ruoAcknowledgedAt columns are globally omitted (src/lib/prisma.ts), so they are re-included
 * per-query here.
 */
export default async function StoreOrderPage({ params }: { params: { id: string } }) {
  const session = await requireClient();

  const quote = await prisma.quote.findFirst({
    where: { id: params.id, customerId: session.customerId, origin: "CLIENT" },
    omit: { origin: false, ruoAcknowledgedAt: false },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      customer: { select: { shippingAddress: true, billingAddress: true, businessName: true } },
    },
  });
  if (!quote) notFound();

  const totalUnits = quote.lineItems.reduce((sum, li) => sum + li.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-lap-teal">Order received</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold text-lap-ink">
            <span className="font-mono" data-testid="order-number">{quote.quoteNumber}</span>
          </h1>
          <p className="mt-2 text-sm text-lap-slate">
            Thanks, {session.name}. Your account manager reviews every order before it ships;
            you will hear from the LA Peptides team shortly.
          </p>
        </div>
        <ClientOrderStatusChip status={quote.status} />
      </div>

      <div className="mt-8 rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap sm:p-6">
        <h2 className="font-heading text-base font-semibold text-lap-ink">Items</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-lap-border text-left text-[11px] uppercase tracking-wide text-lap-slate">
              <th scope="col" className="py-2 pr-3 font-medium">Product</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Qty</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Unit</th>
              <th scope="col" className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.map((li) => (
              <tr key={li.id} className="border-b border-lap-border last:border-b-0">
                <td className="py-2.5 pr-3">
                  <span className="font-medium text-lap-ink">{li.productName}</span>{" "}
                  <span className="text-lap-slate">{li.strength}</span>
                  <span className="block font-mono text-[11px] text-lap-slate">{li.sku}</span>
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-lap-ink">{li.quantity}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-lap-ink">{formatMoney(Number(li.unitPrice))}</td>
                <td className="py-2.5 text-right font-mono font-semibold text-lap-ink">
                  {formatMoney(Number(li.lineTotal))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 text-right text-sm font-semibold text-lap-ink">
                Total ({totalUnits} units)
              </td>
              <td className="pt-3 text-right font-mono text-lg font-semibold text-lap-ink" data-testid="order-total">
                {formatMoney(Number(quote.grandTotal))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-lap-slate">Ships to</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-lap-ink" data-testid="order-shipping">
            {quote.customer.shippingAddress ?? "On file with your account manager"}
          </p>
        </div>
        <div className="rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-lap-slate">Billing</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-lap-ink">
            {quote.customer.billingAddress ?? "Same as shipping"}
          </p>
          {quote.paymentTerms && (
            <p className="mt-3 text-xs text-lap-slate">Payment terms: {quote.paymentTerms}</p>
          )}
        </div>
      </div>

      {quote.ruoAcknowledgedAt && (
        <p className="mt-4 text-xs text-lap-slate" data-testid="order-ruo-line">
          Research use only acknowledged {formatDateTime(quote.ruoAcknowledgedAt)}.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a
          href={`/api/q/${quote.publicToken}/pdf`}
          className="btn-primary px-5 text-sm"
          data-testid="order-pdf-link"
        >
          Download PDF
        </a>
        <ReorderButton quoteId={quote.id} />
        <Link href="/store" className="text-sm font-semibold text-lap-teal hover:underline">
          Continue shopping
        </Link>
        <Link href="/store/account" className="text-sm font-semibold text-lap-teal hover:underline">
          Order history
        </Link>
      </div>

      <p className="mt-8 text-[11px] uppercase tracking-wide text-lap-slate">
        For research purposes only - not for human consumption.
      </p>
    </div>
  );
}
