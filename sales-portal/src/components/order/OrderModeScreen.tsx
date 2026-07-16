"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductCategory } from "@prisma/client";
import type { OrderRails } from "@/lib/data/catalog";
import { cartPooledQuantity } from "@/lib/pricing/clientPreview";
import { OrderIcon, SearchIcon } from "@/components/shell/icons";
import { CustomerChip } from "./CustomerChip";
import { CustomerDrawer } from "./CustomerDrawer";
import { PriceListChip } from "./PriceListChip";
import { SearchOverlay } from "./SearchOverlay";
import { CategoryChips } from "./CategoryChips";
import { ProductRail } from "./ProductRail";
import { ProductCard } from "./ProductCard";
import { useOrderMode } from "./OrderModeProvider";

/**
 * The Order Mode selling surface: customer + ladder context header, discovery rails,
 * category chips, and the browse grid. The cart PANEL lands in the next task - for now
 * the header carries a live unit-count chip fed by the same provider state.
 */
export function OrderModeScreen({ rails }: { rails: OrderRails }) {
  const { state, catalog, purchaseHistory } = useOrderMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [category, setCategory] = useState<ProductCategory | null>(null);

  // "/" opens search from anywhere on the page (unless already typing somewhere).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || searchOpen || drawerOpen) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      event.preventDefault();
      setSearchOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [searchOpen, drawerOpen]);

  const pooledUnits = cartPooledQuantity(state.cart);

  const byVariantId = useMemo(() => {
    const map = new Map<string, (typeof catalog)[number]>();
    for (const product of catalog) for (const variant of product.variants) map.set(variant.id, product);
    return map;
  }, [catalog]);

  function productsForVariantIds(variantIds: string[]) {
    const seen = new Set<string>();
    const products = [];
    for (const id of variantIds) {
      const product = byVariantId.get(id);
      if (product && !seen.has(product.id)) {
        seen.add(product.id);
        products.push(product);
      }
    }
    return products;
  }

  const previouslyPurchased = useMemo(() => {
    if (!state.customer || purchaseHistory.size === 0) return [];
    const ids = [...purchaseHistory.values()]
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
      .map((e) => e.variantId);
    return productsForVariantIds(ids).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.customer, purchaseHistory, byVariantId]);

  const gridProducts = useMemo(
    () => (category ? catalog.filter((p) => p.category === category) : catalog),
    [catalog, category]
  );

  return (
    <div className="space-y-6">
      {/* Context header row */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="sr-only">Order Mode</h1>
        <CustomerChip onOpen={() => setDrawerOpen(true)} />
        <PriceListChip />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex min-h-touch items-center gap-2 rounded-[10px] border border-lap-border bg-lap-surface px-3.5 text-sm text-lap-slate shadow-lap transition-colors duration-200 hover:border-lap-teal hover:text-lap-ink"
          >
            <SearchIcon className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded border border-lap-border px-1.5 py-0.5 font-mono text-[10px] text-lap-slate sm:inline">
              /
            </kbd>
          </button>
          {/* Cart badge placeholder - the full cart panel is the next build step */}
          <span
            data-testid="cart-count-chip"
            aria-label={`Cart: ${pooledUnits} units in ${state.cart.length} lines`}
            className={`flex min-h-touch items-center gap-2 rounded-[10px] border px-3.5 text-sm font-semibold shadow-lap ${
              pooledUnits > 0
                ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
                : "border-lap-border bg-lap-surface text-lap-slate"
            }`}
          >
            <OrderIcon className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="font-mono" data-testid="cart-count-value">
              {pooledUnits}
            </span>
            <span className="hidden text-xs font-normal sm:inline">{pooledUnits === 1 ? "unit" : "units"}</span>
          </span>
        </div>
      </div>

      {/* Discovery rails */}
      <ProductRail title="Previously purchased" products={previouslyPurchased} />
      <ProductRail title="Most ordered" products={productsForVariantIds(rails.mostOrdered)} />
      <ProductRail title="Trending this quarter" products={productsForVariantIds(rails.trending)} />

      {/* Browse */}
      <section aria-label="Browse catalog" className="space-y-3">
        <CategoryChips active={category} onChange={setCategory} />
        {gridProducts.length === 0 ? (
          <p className="py-8 text-center text-sm text-lap-slate">No products in this category.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {gridProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <p className="pt-2 text-[11px] uppercase tracking-wide text-lap-slate">
        For research purposes only - not for human consumption.
      </p>

      <CustomerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
