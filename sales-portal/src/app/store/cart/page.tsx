import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/clientSession";

export const metadata = { title: "Cart | LA Peptides" };

/**
 * Minimal cart placeholder behind requireClient so the product page's "View cart" link is
 * never dead. Task 4 replaces this with the real cart (repriced lines, notes, checkout).
 * Deliberately shows NO prices: cart pricing is computed server-side on the customer's
 * ladder in Task 4, and a placeholder must not improvise numbers.
 */
export default async function StoreCartPage() {
  const session = await requireClient();

  const cart = await prisma.clientCart.findUnique({
    where: { portalUserId: session.id },
    include: {
      items: {
        include: { productVariant: { include: { product: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const items = cart?.items ?? [];
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-lap-ink">Your cart</h1>
      <p className="mt-2 text-sm text-lap-slate">
        {totalUnits} {totalUnits === 1 ? "unit" : "units"} across {items.length}{" "}
        {items.length === 1 ? "line" : "lines"}. Pricing and checkout are coming next.
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-[10px] border border-lap-border bg-lap-page p-8 text-center">
          <p className="text-sm text-lap-slate">Your cart is empty.</p>
          <Link href="/store" className="mt-3 inline-block font-semibold text-lap-teal hover:underline">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-lap-border rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <Link
                  href={`/store/products/${item.productVariant.productId}`}
                  className="font-heading text-sm font-semibold text-lap-ink hover:text-lap-teal"
                >
                  {item.productVariant.product.name}{" "}
                  <span className="font-sans font-normal text-lap-slate">
                    {item.productVariant.size}
                  </span>
                </Link>
                <p className="mt-0.5 font-mono text-[11px] text-lap-slate">{item.productVariant.sku}</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold text-lap-ink">
                &times; {item.quantity}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-[11px] uppercase tracking-wide text-lap-slate">
        For research purposes only - not for human consumption.
      </p>
    </div>
  );
}
