"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { CatalogProduct } from "@/lib/data/catalog";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [showTiers, setShowTiers] = useState(false);
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  if (!variant) return null;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-lap-ink">
            <Link href={`/products/${product.id}`} className="hover:underline">
              {product.name}
            </Link>
          </p>
          <p className="font-mono text-xs text-lap-slate">{variant.sku}</p>
        </div>
        <p className="whitespace-nowrap text-right">
          <span className="font-mono text-lg font-bold text-lap-teal">
            {variant.entryPrice != null ? formatMoney(variant.entryPrice) : "-"}
          </span>
          <span className="block text-xs text-lap-slate">from, per unit</span>
        </p>
      </div>

      {product.description && <p className="mt-2 text-sm text-lap-slate">{product.description}</p>}

      {product.variants.length > 1 && (
        <div className="mt-3">
          <label className="label-text" htmlFor={`strength-${product.id}`}>
            Strength
          </label>
          <select
            id={`strength-${product.id}`}
            className="input-field"
            value={variant.id}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.size} - {v.sku}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowTiers((s) => !s)}
        className="mt-3 text-sm font-medium text-lap-teal"
      >
        {showTiers ? "Hide" : "View"} quantity tiers
      </button>

      {showTiers && (
        <div className="table-scroll mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-lap-slate">
                <th className="py-1 pr-3 font-medium">Tier</th>
                <th className="py-1 pr-3 font-medium">Minimum</th>
                <th className="py-1 font-medium">Unit price</th>
              </tr>
            </thead>
            <tbody>
              {variant.tierPrices.map((t) => (
                <tr key={t.tierNumber} className="border-t border-lap-border">
                  <td className="py-1.5 pr-3">{t.label}</td>
                  <td className="py-1.5 pr-3">
                    {t.maxQty ? `${t.minQty}–${t.maxQty}` : `${t.minQty}+`}
                  </td>
                  <td className="py-1.5 font-mono font-medium text-lap-ink">{formatMoney(t.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
