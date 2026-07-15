"use client";

import { useEffect, useMemo, useState } from "react";
import type { PriceListCode } from "@prisma/client";
import type { CatalogProduct } from "@/lib/data/catalog";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { previewLinePricing } from "@/lib/pricing/clientPreview";
import { formatMoney } from "@/lib/format";
import type { CartLine } from "../wizard-types";

const RECENT_KEY = "lap-sales-portal:recent-variants";

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function pushRecent(sku: string) {
  if (typeof window === "undefined") return;
  const current = readRecent().filter((s) => s !== sku);
  current.unshift(sku);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(current.slice(0, 8)));
}

export function ProductsStep({
  catalog,
  loading,
  priceListCode,
  onPriceListChange,
  cart,
  setCart,
  lineWarnings,
  onContinue,
}: {
  catalog: CatalogProduct[];
  loading: boolean;
  priceListCode: PriceListCode;
  onPriceListChange: (code: PriceListCode) => void;
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  lineWarnings: Array<{ sku: string; warning: string }>;
  onContinue: () => void;
}) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => setRecent(readRecent()), []);

  const filtered = useMemo(
    () =>
      catalog.filter((p) =>
        query ? `${p.name} ${p.variants.map((v) => v.sku).join(" ")}`.toLowerCase().includes(query.toLowerCase()) : true
      ),
    [catalog, query]
  );

  const recentProducts = useMemo(
    () =>
      recent
        .map((sku) => catalog.flatMap((p) => p.variants.map((v) => ({ product: p, variant: v }))).find((x) => x.variant.sku === sku))
        .filter(Boolean)
        .slice(0, 6),
    [recent, catalog]
  );

  function addToCart(product: CatalogProduct, variantId: string, quantity: number) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant || quantity <= 0) return;
    pushRecent(variant.sku);
    setRecent(readRecent());
    const pricing = previewLinePricing(variant, quantity);
    setCart((prev) => {
      const existingIdx = prev.findIndex((l) => l.variantId === variantId);
      if (existingIdx >= 0) {
        const next = [...prev];
        const newQty = next[existingIdx]!.quantity + quantity;
        next[existingIdx] = { ...next[existingIdx]!, quantity: newQty, pricing: previewLinePricing(variant, newQty) };
        return next;
      }
      return [
        ...prev,
        {
          variantId,
          sku: variant.sku,
          productName: product.name,
          strength: variant.size,
          quantity,
          pricing,
        },
      ];
    });
  }

  function updateQuantity(variantId: string, quantity: number) {
    setCart((prev) =>
      prev.map((line) => {
        if (line.variantId !== variantId) return line;
        const product = catalog.find((p) => p.variants.some((v) => v.id === variantId));
        const variant = product?.variants.find((v) => v.id === variantId);
        if (!variant) return { ...line, quantity };
        return { ...line, quantity, pricing: previewLinePricing(variant, quantity) };
      })
    );
  }

  function removeLine(variantId: string) {
    setCart((prev) => prev.filter((l) => l.variantId !== variantId));
  }

  function duplicateLine(variantId: string) {
    setCart((prev) => {
      const line = prev.find((l) => l.variantId === variantId);
      if (!line) return prev;
      return [...prev, { ...line }];
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label-text">Price list for this quote</label>
        <select
          className="input-field"
          value={priceListCode}
          onChange={(e) => onPriceListChange(e.target.value as PriceListCode)}
        >
          {(Object.keys(PRICE_LIST_LABELS) as PriceListCode[]).map((code) => (
            <option key={code} value={code}>
              {PRICE_LIST_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      <input
        type="search"
        inputMode="search"
        placeholder="Search products or SKU…"
        className="input-field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {recentProducts.length > 0 && !query && (
        <div>
          <p className="label-text">Recently used</p>
          <div className="table-scroll">
            <div className="flex gap-2">
              {recentProducts.map((entry) => (
                <button
                  key={entry!.variant.id}
                  type="button"
                  onClick={() => addToCart(entry!.product, entry!.variant.id, 1)}
                  className="min-h-touch whitespace-nowrap rounded-full border border-brand-border bg-brand-surface px-3 text-sm text-brand-slate-200"
                >
                  {entry!.product.name} {entry!.variant.size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <div className="card p-4">
          <h2 className="mb-2 font-semibold text-white">Cart ({cart.length})</h2>
          <ul className="space-y-3">
            {cart.map((line) => {
              const warning = lineWarnings.find((w) => w.sku === line.sku);
              return (
                <li key={line.variantId} className="border-t border-brand-border pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">
                        {line.productName} {line.strength}
                      </p>
                      <p className="font-mono text-xs text-brand-slate-400">{line.sku}</p>
                      {line.pricing.qualifies ? (
                        <p className="text-xs text-brand-slate-400">{line.pricing.appliedTier?.label}</p>
                      ) : (
                        <p className="text-xs text-brand-danger">{line.pricing.warning}</p>
                      )}
                      {warning && <p className="text-xs text-brand-danger">{warning.warning}</p>}
                    </div>
                    <p className="whitespace-nowrap text-right font-semibold text-white">
                      {line.pricing.qualifies ? formatMoney(line.pricing.lineTotal!) : "—"}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateQuantity(line.variantId, Math.max(1, Number(e.target.value) || 1))}
                      className="input-field w-24 text-center"
                    />
                    <button type="button" className="btn-secondary !min-h-0 !px-3 !py-1.5 text-xs" onClick={() => duplicateLine(line.variantId)}>
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="btn-danger !min-h-0 !px-3 !py-1.5 text-xs"
                      onClick={() => removeLine(line.variantId)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm text-brand-slate-400">Loading catalog…</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((product) => (
            <ProductAddCard key={product.id} product={product} onAdd={addToCart} />
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <button type="button" className="btn-primary w-full" onClick={onContinue}>
          Continue to Charges
        </button>
      )}
    </div>
  );
}

function ProductAddCard({
  product,
  onAdd,
}: {
  product: CatalogProduct;
  onAdd: (product: CatalogProduct, variantId: string, quantity: number) => void;
}) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [quantity, setQuantity] = useState(product.variants[0]?.tierPrices[0]?.minQty ?? 1);
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  if (!variant) return null;

  const preview = previewLinePricing(variant, quantity);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{product.name}</p>
          <p className="font-mono text-xs text-brand-slate-400">{variant.sku}</p>
        </div>
        <p className="text-right text-sm text-brand-slate-400">
          {preview.qualifies ? (
            <>
              <span className="block font-semibold text-brand-teal">{formatMoney(preview.unitPrice!)}/unit</span>
              {preview.appliedTier?.label}
            </>
          ) : (
            <span className="text-brand-danger">{preview.warning}</span>
          )}
        </p>
      </div>

      <div className="mt-3 flex items-end gap-2">
        {product.variants.length > 1 && (
          <div className="flex-1">
            <label className="label-text">Strength</label>
            <select className="input-field" value={variant.id} onChange={(e) => setVariantId(e.target.value)}>
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.size}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="w-24">
          <label className="label-text">Qty</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            className="input-field text-center"
          />
        </div>
        <button type="button" className="btn-primary !min-h-0 flex-1 !py-2.5" onClick={() => onAdd(product, variant.id, quantity)}>
          Add
        </button>
      </div>
    </div>
  );
}
