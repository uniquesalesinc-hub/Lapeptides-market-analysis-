"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/data/catalog";
import { CATEGORY_LABELS } from "@/lib/data/catalog";
import { cartPooledQuantity, previewLinePricing } from "@/lib/pricing/clientPreview";
import { formatMoney, formatDate } from "@/lib/format";
import { MinusIcon, PlusIcon } from "@/components/shell/icons";
import { CategoryDot } from "./CategoryChips";
import { QtyInput } from "./QtyInput";
import { useOrderMode } from "./OrderModeProvider";

/**
 * Data-forward product card for the Order Mode browse surface: no photos, mono prices,
 * the signature tier-ladder bands (active band = teal wash + bottom teal-bright underline,
 * never a side stripe), MOQ, last-order line for the selected customer, stepper + Add.
 */
export function ProductCard({ product }: { product: CatalogProduct }) {
  const { state, addLine, addSample, purchaseHistory } = useOrderMode();
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const moq = variant ? Math.min(...variant.tierPrices.map((t) => t.minQty)) : 1;
  const [quantity, setQuantity] = useState(moq);

  const pooledBase = useMemo(() => cartPooledQuantity(state.cart), [state.cart]);

  if (!variant) return null;

  // Preview what this line would price at if added NOW: injectables qualify against the
  // pooled cart total plus this candidate quantity; capsules qualify on their own quantity.
  const qualifying = product.category === "CAPSULE" ? quantity : pooledBase + quantity;
  const preview = previewLinePricing(variant, quantity, qualifying);
  const history = purchaseHistory.get(variant.id);
  const inCart = state.cart.find((l) => l.variantId === variant.id && !l.isSample);

  function selectVariant(id: string) {
    setVariantId(id);
    const nextVariant = product.variants.find((v) => v.id === id);
    if (nextVariant) setQuantity(Math.min(...nextVariant.tierPrices.map((t) => t.minQty)));
  }

  return (
    <div className="flex h-full flex-col rounded-[10px] border border-lap-border bg-lap-surface p-4 shadow-lap">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-lap-slate">
            <CategoryDot category={product.category} />
            {CATEGORY_LABELS[product.category]}
          </p>
          <h3 className="mt-1 truncate font-heading text-base font-semibold text-lap-ink">
            <Link
              href={`/products/${product.id}`}
              className="transition-colors duration-150 hover:text-lap-teal hover:underline"
            >
              {product.name}
            </Link>
          </h3>
        </div>
        <div className="shrink-0 text-right">
          {preview.qualifies ? (
            <>
              <p className="font-mono text-lg font-semibold text-lap-teal">{formatMoney(preview.unitPrice!)}</p>
              <p className="text-[11px] text-lap-slate">per unit · {tierShortLabel(preview.appliedTier?.tier)}</p>
            </>
          ) : (
            <>
              <p className="font-mono text-lg font-semibold text-lap-ink">
                {variant.entryPrice != null ? formatMoney(variant.entryPrice) : "No price"}
              </p>
              <p className="text-[11px] text-lap-amber">at MOQ {moq}</p>
            </>
          )}
        </div>
      </div>

      {/* Size badge chips */}
      {product.variants.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => selectVariant(v.id)}
              aria-pressed={v.id === variant.id}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                v.id === variant.id
                  ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
                  : "border-lap-border text-lap-slate hover:border-lap-teal"
              }`}
            >
              {v.size}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <span className="rounded-full border border-lap-border px-3 py-1.5 text-xs font-semibold text-lap-slate">
            {variant.size}
          </span>
        </div>
      )}

      {/* Signature tier ladder: bordered mono bands, active band teal-wash + bottom underline */}
      <div className="mt-3 overflow-x-auto">
        <div className="flex min-w-max gap-1 font-mono">
          {variant.tierPrices.map((t) => {
            const active = preview.qualifies && preview.appliedTier?.tier === t.tierNumber;
            const range = t.maxQty != null ? `${t.minQty}-${t.maxQty}` : `${t.minQty}+`;
            return (
              <button
                key={t.tierNumber}
                type="button"
                onClick={() => setQuantity(Math.max(1, t.minQty))}
                title={`Set quantity to ${Math.max(1, t.minQty)}`}
                aria-label={`Set quantity to ${Math.max(1, t.minQty)} (${range} band, ${formatMoney(t.unitPrice)} per unit)`}
                className={`rounded-md border px-2.5 py-1.5 text-center transition-colors duration-150 ${
                  active
                    ? "border-lap-border bg-lap-teal-wash shadow-[inset_0_-2px_0_0_#0DA5BC]"
                    : "border-lap-border hover:border-lap-teal hover:bg-lap-page"
                }`}
              >
                <div className="text-[10px] text-lap-slate">{range}</div>
                <div className={`text-xs font-semibold ${active ? "text-lap-teal" : "text-lap-ink"}`}>
                  {formatMoney(t.unitPrice)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-lap-slate">
        <span>
          MOQ {moq}
          {product.category === "CAPSULE" && " · priced per SKU, exempt from pooling"}
        </span>
        {inCart && (
          <span className="rounded-full bg-lap-teal-wash px-2 py-0.5 font-mono font-semibold text-lap-teal">
            {inCart.quantity} in cart
          </span>
        )}
      </div>

      {history && (
        <p className="mt-1.5 text-xs text-lap-slate">
          Last order: <span className="font-mono font-semibold text-lap-ink">{history.lastQuantity}</span> @{" "}
          <span className="font-mono font-semibold text-lap-ink">{formatMoney(history.lastUnitPrice)}</span> on{" "}
          {formatDate(history.lastDate)}
        </p>
      )}

      <div className="mt-auto flex items-stretch gap-2 pt-3">
        <div className="flex items-stretch rounded-[10px] border border-lap-border">
          <button
            type="button"
            aria-label={`Decrease quantity of ${product.name} ${variant.size}`}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-touch w-touch items-center justify-center rounded-l-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
          >
            <MinusIcon className="h-4 w-4" />
          </button>
          <QtyInput
            value={quantity}
            min={1}
            onCommit={setQuantity}
            aria-label={`Quantity of ${product.name} ${variant.size}`}
            className="w-14 border-x border-lap-border bg-lap-surface text-center font-mono text-sm text-lap-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lap-teal-bright/40"
          />
          <button
            type="button"
            aria-label={`Increase quantity of ${product.name} ${variant.size}`}
            onClick={() => setQuantity((q) => q + 1)}
            className="flex h-touch w-touch items-center justify-center rounded-r-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          data-testid={`add-${variant.sku}`}
          onClick={() => addLine(variant.id, quantity)}
          className="min-h-touch flex-1 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark"
        >
          Add
        </button>
        <button
          type="button"
          data-testid={`sample-${variant.sku}`}
          onClick={() => addSample(variant.id, 1)}
          title="Add one free tracked sample"
          className="min-h-touch rounded-[10px] border border-lap-border px-3 text-xs font-semibold text-lap-slate transition-colors duration-150 hover:border-lap-amber hover:text-lap-amber"
        >
          Sample
        </button>
      </div>
    </div>
  );
}

function tierShortLabel(tier: number | undefined): string {
  return tier != null ? `Tier ${tier}` : "";
}
