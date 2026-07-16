import Link from "next/link";
import type { ProductCategory } from "@prisma/client";
import { getClientSession } from "@/lib/clientSession";
import { getStoreCatalog } from "@/lib/data/storeCatalog";
import { CATEGORY_LABELS } from "@/lib/data/catalog";
import { StoreProductCard } from "@/components/store/StoreProductCard";

/**
 * Store home: hero strip + the browsable product grid. Prices are gated in the data layer
 * (getStoreCatalog nulls every price field for anonymous sessions), so this page cannot
 * render a dollar amount to a logged-out visitor even by mistake. Category filtering runs
 * off the ?category= link nav in the masthead.
 */
export default async function StoreHomePage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const session = await getClientSession();
  const products = await getStoreCatalog(session);

  const category =
    searchParams?.category && searchParams.category in CATEGORY_LABELS
      ? (searchParams.category as ProductCategory)
      : null;
  const visible = category ? products.filter((p) => p.category === category) : products;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      {/* Hero strip */}
      <section className="border-b border-lap-border py-10 sm:py-14">
        {session ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-lap-teal">
              {session.customerName}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold text-lap-ink sm:text-4xl">
              Welcome back, {session.name.split(" ")[0]}
            </h1>
            <p className="mt-3 max-w-xl text-lap-slate">
              Every price below is your account pricing, retail band and volume tiers included.
            </p>
            <div className="mt-6">
              <Link href="/store/account" className="font-semibold text-lap-teal hover:underline">
                Your account
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-lap-teal">
              Wholesale client portal
            </p>
            <h1 className="mt-2 max-w-2xl font-heading text-3xl font-semibold text-lap-ink sm:text-4xl">
              Research peptides at wholesale, priced for your account
            </h1>
            <p className="mt-3 max-w-xl text-lap-slate">
              Browse the full LA Peptides catalog. Approved wholesale buyers log in to see their
              pricing and order self-serve.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/store/signup" className="btn-primary px-6">
                Request an account
              </Link>
              <Link href="/store/login" className="btn-secondary px-6">
                Client login
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Grid header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-6 pt-10">
        <h2 className="font-heading text-xl font-semibold text-lap-ink">
          {category ? CATEGORY_LABELS[category] : "All products"}
        </h2>
        <p className="text-sm text-lap-slate">
          {visible.length} {visible.length === 1 ? "product" : "products"}
          {category && (
            <>
              {" · "}
              <Link href="/store" className="font-medium text-lap-teal hover:underline">
                Clear filter
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Product grid */}
      {visible.length === 0 ? (
        <p className="rounded-[10px] border border-lap-border bg-lap-page p-8 text-center text-sm text-lap-slate">
          No products in this category right now.
        </p>
      ) : (
        <section
          data-testid="store-grid"
          aria-label="Product catalog"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((product) => (
            <StoreProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </div>
  );
}
