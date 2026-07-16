"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/data/catalog";
import type { StoreSearchItem } from "@/lib/data/storeCatalog";
import { CloseIcon, SearchIcon } from "@/components/shell/icons";
import { CategoryDot } from "@/components/order/CategoryChips";

/**
 * Storefront search: a masthead trigger opening a client-side filter overlay over the
 * unpriced search index (names, sizes, SKUs). Rows navigate to the product page, where
 * pricing renders behind the normal login gate - the overlay itself never shows a price,
 * so it is safe for anonymous visitors by construction. "/" opens, Esc closes.
 */
export function StoreSearch({ items }: { items: StoreSearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "/" && !open) {
        const target = event.target as HTMLElement | null;
        if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
        event.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [open]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.skus.some((sku) => sku.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [items, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the catalog"
        className="flex min-h-touch items-center gap-2 rounded-full border border-lap-border bg-lap-surface px-4 text-sm text-lap-slate transition-colors duration-150 hover:border-lap-teal hover:text-lap-ink sm:min-w-[220px]"
      >
        <SearchIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Search the catalog</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search products">
          <div className="absolute inset-0 bg-lap-teal-dark/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 top-0 mx-auto max-w-2xl p-4 md:top-16">
            <div className="overflow-hidden rounded-[10px] border border-lap-border bg-lap-surface shadow-lapDrawer">
              <div className="flex items-center gap-2 border-b border-lap-border px-4">
                <SearchIcon className="h-[18px] w-[18px] shrink-0 text-lap-slate" />
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
                  onClick={() => setOpen(false)}
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
                    {rows.map((item) => (
                      <li key={item.id} className="border-b border-lap-border last:border-b-0">
                        <Link
                          href={`/store/products/${item.id}`}
                          onClick={() => setOpen(false)}
                          className="flex min-h-touch items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-lap-page"
                        >
                          <CategoryDot category={item.category} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-lap-ink">
                              {item.name}
                            </span>
                            <span className="block truncate text-xs text-lap-slate">
                              {CATEGORY_LABELS[item.category]} · {item.sizes.join(", ")}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
