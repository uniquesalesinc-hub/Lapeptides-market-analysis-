"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/data/catalog";
import { previewLinePricing } from "@/lib/pricing/clientPreview";
import { cartPooledQuantity } from "@/lib/pricing/clientPreview";
import { formatMoney } from "@/lib/format";
import { CloseIcon, SearchIcon } from "@/components/shell/icons";
import { CategoryDot } from "./CategoryChips";
import { useOrderMode } from "./OrderModeProvider";

/**
 * Live search-as-you-type overlay over the ~110-SKU catalog (client-side name/SKU filter).
 * Opens from the header search button or the "/" key; Esc closes. Explicit Add buttons only.
 */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, catalog, addLine } = useOrderMode();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const pooled = useMemo(() => cartPooledQuantity(state.cart), [state.cart]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .flatMap((product) => product.variants.map((variant) => ({ product, variant })))
      .filter(
        ({ product, variant }) =>
          product.name.toLowerCase().includes(q) || variant.sku.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [catalog, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search products">
      <div className="absolute inset-0 bg-lap-teal-dark/30" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 mx-auto max-w-2xl p-4 md:top-10">
        <div className="overflow-hidden rounded-[10px] border border-lap-border bg-lap-surface shadow-lapDrawer">
          <div className="flex items-center gap-2 border-b border-lap-border px-4">
            <SearchIcon className="h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 text-lap-slate" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products or SKU"
              className="min-h-touch w-full bg-transparent py-3 text-sm text-lap-ink placeholder:text-lap-slate/70 focus:outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="flex h-touch w-touch shrink-0 items-center justify-center rounded-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[60dvh] overflow-y-auto">
            {query.trim() === "" ? (
              <p className="px-4 py-6 text-center text-sm text-lap-slate">
                Type a product name or SKU. Press Esc to close.
              </p>
            ) : rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-lap-slate">
                Nothing matches &quot;{query}&quot;.
              </p>
            ) : (
              <ul>
                {rows.map(({ product, variant }) => {
                  const moq = Math.min(...variant.tierPrices.map((t) => t.minQty));
                  const inCart = state.cart.some((l) => l.variantId === variant.id);
                  // Price shown = what one more unit of this SKU earns against the current
                  // pool; below the pool minimum we show the honest sheet entry price.
                  const qualifying = product.category === "CAPSULE" ? 1 : pooled + 1;
                  const preview = previewLinePricing(variant, 1, qualifying);
                  const price = preview.qualifies ? preview.unitPrice : variant.entryPrice;
                  return (
                    <li key={variant.id} className="border-b border-lap-border last:border-b-0">
                      <div className="flex min-h-touch items-center gap-3 px-4 py-2">
                        <CategoryDot category={product.category} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-lap-ink">
                            {product.name} <span className="font-normal text-lap-slate">{variant.size}</span>
                          </p>
                          <p className="truncate font-mono text-[11px] text-lap-slate">
                            {variant.sku} · {CATEGORY_LABELS[product.category]}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold text-lap-ink">
                          {price != null ? (
                            <>
                              {!preview.qualifies && <span className="font-sans text-[11px] font-normal text-lap-slate">from </span>}
                              {formatMoney(price)}
                            </>
                          ) : (
                            "No price"
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => addLine(variant.id, inCart ? 1 : moq)}
                          className="min-h-touch shrink-0 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark"
                        >
                          Add
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
