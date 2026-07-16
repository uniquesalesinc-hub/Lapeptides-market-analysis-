"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { PRICE_LIST_LABELS, CATEGORY_LABELS } from "@/lib/data/catalog";
import type { PriceListCode, ProductCategory } from "@prisma/client";

export function CatalogFilters({
  priceListCode,
  category,
  search,
}: {
  priceListCode: PriceListCode;
  category?: ProductCategory;
  search?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(search ?? "");
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="space-y-3">
      <div className="table-scroll">
        <div className="flex gap-2">
          {(Object.keys(PRICE_LIST_LABELS) as PriceListCode[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => updateParam("priceList", code)}
              className={`min-h-touch whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${
                priceListCode === code
                  ? "border-lap-teal bg-lap-teal text-white"
                  : "border-lap-border bg-lap-surface text-lap-slate"
              }`}
            >
              {PRICE_LIST_LABELS[code]}
            </button>
          ))}
        </div>
      </div>

      <input
        type="search"
        inputMode="search"
        placeholder="Search products or SKU…"
        className="input-field"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          updateParam("q", e.target.value || undefined);
        }}
      />

      <div className="table-scroll">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => updateParam("category", undefined)}
            className={`min-h-touch whitespace-nowrap rounded-full border px-3 text-xs font-semibold ${
              !category
                ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
                : "border-lap-border text-lap-slate"
            }`}
          >
            All categories
          </button>
          {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => updateParam("category", cat)}
              className={`min-h-touch whitespace-nowrap rounded-full border px-3 text-xs font-semibold ${
                category === cat
                  ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
                  : "border-lap-border text-lap-slate"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
