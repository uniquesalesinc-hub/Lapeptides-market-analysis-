"use client";

import { useEffect, useMemo, useState } from "react";
import type { PriceListCode } from "@prisma/client";
import type { CatalogProduct } from "@/lib/data/catalog";
import { PRICE_LIST_LABELS, CATEGORY_LABELS } from "@/lib/data/catalog";
import type { ProductCategory } from "@prisma/client";
import { previewLinePricing, repriceCart, cartPooledQuantity } from "@/lib/pricing/clientPreview";
import { formatMoney } from "@/lib/format";
import { QuantityInput } from "../QuantityInput";
import type { CartLine, QuoteLadderCode } from "../wizard-types";

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
  priceListCode: QuoteLadderCode;
  onPriceListChange: (code: QuoteLadderCode) => void;
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  lineWarnings: Array<{ sku: string; warning: string }>;
  onContinue: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => setRecent(readRecent()), []);

  const filtered = useMemo(
    () =>
      catalog
        .filter((p) => (category ? p.category === category : true))
        .filter((p) =>
          query ? `${p.name} ${p.variants.map((v) => v.sku).join(" ")}`.toLowerCase().includes(query.toLowerCase()) : true
        ),
    [catalog, query, category]
  );

  const recentProducts = useMemo(
    () =>
      recent
        .map((sku) => catalog.flatMap((p) => p.variants.map((v) => ({ product: p, variant: v }))).find((x) => x.variant.sku === sku))
        .filter(Boolean)
        .slice(0, 6),
    [recent, catalog]
  );

  // Every cart mutation goes through repriceCart: under mix-and-match pooling, changing ANY
  // line's quantity can move EVERY line's tier, so per-line repricing would leave the rest
  // of the cart stale.
  function addToCart(product: CatalogProduct, variantId: string, quantity: number) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant || quantity <= 0) return;
    pushRecent(variant.sku);
    setRecent(readRecent());
    setCart((prev) => {
      const existingIdx = prev.findIndex((l) => l.variantId === variantId);
      const next =
        existingIdx >= 0
          ? prev.map((l, i) => (i === existingIdx ? { ...l, quantity: l.quantity + quantity } : l))
          : [
              ...prev,
              {
                variantId,
                sku: variant.sku,
                productName: product.name,
                strength: variant.size,
                quantity,
                pricing: previewLinePricing(variant, quantity),
              },
            ];
      return repriceCart(catalog, next);
    });
  }

  function updateQuantity(variantId: string, quantity: number) {
    setCart((prev) =>
      repriceCart(
        catalog,
        prev.map((line) => (line.variantId === variantId ? { ...line, quantity } : line))
      )
    );
  }

  function removeLine(variantId: string) {
    // Removing a line shrinks the pool — the remaining lines may drop a tier, so reprice.
    setCart((prev) => repriceCart(catalog, prev.filter((l) => l.variantId !== variantId)));
  }

  // Doubles this line's quantity rather than adding a second independent line for the same
  // SKU — cart lines are always keyed one-per-variant so volume tiers are computed on the
  // true combined quantity. Two separate $16.50/unit lines at 250 units each must become
  // one 500-unit line at whatever tier 500 actually qualifies for, not stay split and
  // under-priced at the 250-unit tier.
  function duplicateLine(variantId: string) {
    setCart((prev) =>
      repriceCart(
        catalog,
        prev.map((l) => (l.variantId === variantId ? { ...l, quantity: l.quantity * 2 } : l))
      )
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label-text">Injectable pricing ladder for this quote</label>
        <select
          className="input-field"
          value={priceListCode}
          onChange={(e) => onPriceListChange(e.target.value as QuoteLadderCode)}
        >
          {(["BULK_RETAIL", "BULK_WHOLESALE"] as QuoteLadderCode[]).map((code) => (
            <option key={code} value={code}>
              {PRICE_LIST_LABELS[code]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-brand-slate-400">
          Sprays, creams, and capsules always price from their own sheets. Every unit on the
          quote counts toward volume tiers (mix &amp; match), except capsules (priced per SKU, 1–49).
        </p>
      </div>

      <input
        type="search"
        inputMode="search"
        placeholder="Search products or SKU…"
        className="input-field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Category buttons — "GLP, boom, they all pop up" (review call 7/15) */}
      <div className="table-scroll">
        <div className="flex gap-2">
          <CategoryChip label="All" active={category === null} onClick={() => setCategory(null)} />
          {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((c) => (
            <CategoryChip key={c} label={CATEGORY_LABELS[c]} active={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
      </div>

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
                    <QuantityInput value={line.quantity} onChange={(qty) => updateQuantity(line.variantId, qty)} />
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
            <ProductAddCard key={product.id} product={product} onAdd={addToCart} pooledBase={cartPooledQuantity(cart)} />
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

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-touch whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${
        active
          ? "border-brand-teal bg-brand-teal text-white"
          : "border-brand-border bg-brand-surface text-brand-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function ProductAddCard({
  product,
  onAdd,
  pooledBase,
}: {
  product: CatalogProduct;
  onAdd: (product: CatalogProduct, variantId: string, quantity: number) => void;
  pooledBase: number;
}) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [quantity, setQuantity] = useState(product.variants[0]?.tierPrices[0]?.minQty ?? 1);
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  if (!variant) return null;

  // Preview what this line would cost if added NOW: the pool includes the current cart plus
  // this candidate quantity (capsules qualify on their own quantity - per-SKU 1-49 band).
  const qualifying = product.category === "CAPSULE" ? quantity : pooledBase + quantity;
  const preview = previewLinePricing(variant, quantity, qualifying);

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

      {/* Tier ladder mirrored from the pricing sheets; the highlighted cell is what this
          quantity (plus the rest of the cart, mix-and-match) qualifies for. */}
      {variant.tierPrices.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <div className="flex min-w-max gap-1">
            {variant.tierPrices.map((t) => {
              const isApplied = preview.qualifies && preview.appliedTier?.tier === t.tierNumber;
              const range = t.maxQty != null ? `${t.minQty}–${t.maxQty}` : `${t.minQty}+`;
              return (
                <div
                  key={t.tierNumber}
                  className={`rounded-lg border px-2.5 py-1.5 text-center ${
                    isApplied ? "border-brand-teal bg-brand-teal/10" : "border-brand-border"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-brand-slate-400">{range}</div>
                  <div className={`text-sm font-semibold ${isApplied ? "text-brand-teal" : "text-white"}`}>
                    {formatMoney(t.unitPrice)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <QuantityInput value={quantity} onChange={setQuantity} className="input-field text-center" />
        </div>
        <button type="button" className="btn-primary !min-h-0 flex-1 !py-2.5" onClick={() => onAdd(product, variant.id, quantity)}>
          Add
        </button>
      </div>
    </div>
  );
}
