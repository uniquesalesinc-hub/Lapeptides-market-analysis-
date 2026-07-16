import Link from "next/link";
import { requireClient } from "@/lib/clientSession";
import { getPricedClientCart } from "@/lib/data/clientCart";
import { CartView } from "@/components/store/CartView";

export const metadata = { title: "Cart | LA Peptides" };

/**
 * The real client cart. Server component: loads the cart and re-prices every line on the
 * customer's assigned ladder with POOLED tier qualification (same rule as the rep cart;
 * capsules exempt inside the resolver, and there is no samples concept here - every unit
 * pools and counts toward the 20-unit order minimum). The client component below only
 * mutates and renders; it never computes a price.
 */
export default async function StoreCartPage() {
  const session = await requireClient();
  const cart = await getPricedClientCart(session);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-lap-ink">Your cart</h1>

      {cart.items.length === 0 ? (
        <div className="mt-8 rounded-[10px] border border-lap-border bg-lap-page p-8 text-center">
          <p className="text-sm text-lap-slate">Your cart is empty.</p>
          <Link href="/store" className="mt-3 inline-block font-semibold text-lap-teal hover:underline">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <CartView cart={cart} />
        </div>
      )}

      <p className="mt-6 text-[11px] uppercase tracking-wide text-lap-slate">
        For research purposes only - not for human consumption.
      </p>
    </div>
  );
}
