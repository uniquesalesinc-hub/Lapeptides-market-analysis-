import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/clientSession";
import { clientLogoutAction } from "@/lib/actions/client-auth-actions";
import { formatDate, formatMoney } from "@/lib/format";
import { ClientOrderStatusChip } from "@/components/store/ClientOrderStatusChip";

export const metadata = { title: "Account | LA Peptides" };

/**
 * Client account: order history. Only CLIENT-origin quotes for the session's own customer
 * appear here - rep-built quotes are internal documents and stay off this surface. Each row
 * links to the order page, which carries the Reorder action.
 */
export default async function StoreAccountPage() {
  const client = await requireClient();

  const orders = await prisma.quote.findMany({
    where: { customerId: client.customerId, origin: "CLIENT" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, quoteNumber: true, createdAt: true, grandTotal: true, status: true },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-lap-teal">
            {client.customerName}
          </p>
          <h1 className="font-heading text-3xl font-semibold text-lap-ink">Welcome, {client.name}</h1>
        </div>
        <form action={clientLogoutAction}>
          <button type="submit" className="btn-secondary px-5 text-sm">
            Log out
          </button>
        </form>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-lap-ink">Your orders</h2>
          <Link href="/store" className="text-sm font-semibold text-lap-teal hover:underline">
            Browse the catalog
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="mt-4 rounded-[10px] border border-lap-border bg-lap-page p-8 text-center">
            <p className="text-sm text-lap-slate">No orders yet. Your first order will appear here.</p>
            <Link href="/store" className="mt-3 inline-block font-semibold text-lap-teal hover:underline">
              Start an order
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-lap-border rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/store/orders/${order.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-150 hover:bg-lap-page"
                  data-testid={`account-order-${order.quoteNumber}`}
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-lap-ink">{order.quoteNumber}</p>
                    <p className="mt-0.5 text-xs text-lap-slate">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-lap-ink">
                      {formatMoney(Number(order.grandTotal))}
                    </span>
                    <ClientOrderStatusChip status={order.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-8 text-[11px] uppercase tracking-wide text-lap-slate">
        For research purposes only - not for human consumption.
      </p>
    </div>
  );
}
