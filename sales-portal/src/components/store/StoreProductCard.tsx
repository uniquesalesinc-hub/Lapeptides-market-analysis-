import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/data/catalog";
import type { StoreProduct } from "@/lib/data/storeCatalog";
import { formatMoney } from "@/lib/format";
import { CategoryDot } from "@/components/order/CategoryChips";

/**
 * Storefront product card: roomier than the rep app's dense cards (brand register), same
 * design system. The whole card clicks through via a stretched name link; the anonymous
 * "Login to view pricing" link sits above it (relative z-10) so both targets work.
 */
export function StoreProductCard({ product }: { product: StoreProduct }) {
  return (
    <article className="relative flex flex-col rounded-[10px] border border-lap-border bg-lap-surface p-6 shadow-lap transition-shadow duration-200 hover:shadow-lapDrawer">
      <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-lap-slate">
        <CategoryDot category={product.category} />
        {CATEGORY_LABELS[product.category]}
      </p>

      <h2 className="mt-2 font-heading text-lg font-semibold text-lap-ink">
        <Link
          href={`/store/products/${product.id}`}
          className="after:absolute after:inset-0 hover:text-lap-teal"
        >
          {product.name}
        </Link>
      </h2>

      {product.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-lap-slate">{product.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {product.variants.map((v) => (
          <span
            key={v.id}
            className="rounded-full border border-lap-border px-2.5 py-1 text-xs font-medium text-lap-slate"
          >
            {v.size}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-5">
        {product.fromPrice != null ? (
          <p className="font-mono text-sm font-semibold text-lap-teal">
            From {formatMoney(product.fromPrice)}
            <span className="ml-1.5 font-sans text-xs font-normal text-lap-slate">per unit</span>
          </p>
        ) : (
          <Link
            href="/store/login"
            className="relative z-10 text-sm font-semibold text-lap-teal hover:underline"
          >
            Login to view pricing
          </Link>
        )}
      </div>

      <p className="mt-3 text-[10px] uppercase tracking-wide text-lap-slate">
        For research purposes only - not for human consumption.
      </p>
    </article>
  );
}
