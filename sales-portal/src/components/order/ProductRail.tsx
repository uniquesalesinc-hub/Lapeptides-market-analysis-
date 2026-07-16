"use client";

import type { CatalogProduct } from "@/lib/data/catalog";
import { ProductCard } from "./ProductCard";

/**
 * Horizontal snap-scrolling rail of product cards ("Most ordered", "Trending this
 * quarter", "Previously purchased"). Renders nothing when there is nothing to show -
 * an empty rail is noise, not information.
 */
export function ProductRail({ title, products }: { title: string; products: CatalogProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section aria-label={title}>
      <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-lap-slate">{title}</h2>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3">
          {products.map((product) => (
            <div key={product.id} className="w-[300px] shrink-0 snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
