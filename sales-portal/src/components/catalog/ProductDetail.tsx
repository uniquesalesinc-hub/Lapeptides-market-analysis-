"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogVariant, ProductDetailData } from "@/lib/data/catalog";
import { CATEGORY_LABELS } from "@/lib/data/catalog";
import { cartPooledQuantity, previewLinePricing } from "@/lib/pricing/clientPreview";
import { formatDate, formatMoney } from "@/lib/format";
import { MinusIcon, OrderIcon, PlusIcon } from "@/components/shell/icons";
import { CategoryDot } from "@/components/order/CategoryChips";
import { QtyInput } from "@/components/order/QtyInput";
import { ProductRail } from "@/components/order/ProductRail";
import { useOrderMode } from "@/components/order/OrderModeProvider";

function moqOf(variant: CatalogVariant): number {
  return Math.min(...variant.tierPrices.map((t) => t.minQty));
}

/**
 * Product detail surface: full tier band grid for the session's active ladder (pooled band
 * highlighted, per the Order Mode cart carried in via OrderModeProvider), size variant
 * chips, qty stepper + add, "Other sizes" anchors, and a deterministic "Same category" rail.
 */
export function ProductDetail({ detail }: { detail: ProductDetailData }) {
  const { state, catalog, addLine, purchaseHistory } = useOrderMode();
  const variants = detail.byLadder[state.ladder];

  const [selectedId, setSelectedId] = useState<string | undefined>(variants[0]?.id);
  // The ladder can change under us (session restore, override); never point at a variant
  // that is not priced on the current ladder.
  const variant = variants.find((v) => v.id === selectedId) ?? variants[0];
  const [quantity, setQuantity] = useState(() => (variant ? moqOf(variant) : 1));
  const [customerHint, setCustomerHint] = useState(false);

  const pooled = useMemo(() => cartPooledQuantity(state.cart), [state.cart]);

  const related = useMemo(
    () => catalog.filter((p) => p.category === detail.category && p.id !== detail.id).slice(0, 8),
    [catalog, detail.category, detail.id]
  );

  if (!variant) {
    return (
      <div className="rounded-[10px] border border-lap-border bg-lap-surface p-6 text-sm text-lap-slate shadow-lap">
        This product has no pricing on the current price list.
      </div>
    );
  }

  const moq = moqOf(variant);
  // Same qualification preview as the Order Mode cards: injectables (and sprays/creams)
  // qualify against the pooled cart plus this candidate quantity; capsules stand alone.
  const qualifying = detail.category === "CAPSULE" ? quantity : pooled + quantity;
  const preview = previewLinePricing(variant, quantity, qualifying);
  const history = purchaseHistory.get(variant.id);
  const inCart = state.cart.find((l) => l.variantId === variant.id);

  function selectVariant(id: string) {
    setSelectedId(id);
    const next = variants.find((v) => v.id === id);
    if (next) setQuantity(moqOf(next));
  }

  function handleAdd() {
    if (!state.customer) {
      setCustomerHint(true);
      return;
    }
    addLine(variant!.id, quantity);
  }

  return (
    <div className="space-y-6">
      {/* Header: category, name, cart context */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-lap-slate">
            <CategoryDot category={detail.category} />
            {CATEGORY_LABELS[detail.category]}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold text-lap-ink">{detail.name}</h1>
        </div>
        <Link
          href="/order"
          data-testid="detail-cart-chip"
          aria-label={`View cart: ${pooled} units in ${state.cart.length} lines`}
          className={`flex min-h-touch items-center gap-2 rounded-[10px] border px-3.5 text-sm font-semibold shadow-lap transition-colors duration-200 ${
            pooled > 0
              ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
              : "border-lap-border bg-lap-surface text-lap-slate"
          }`}
        >
          <OrderIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="font-mono" data-testid="detail-cart-count">
            {pooled}
          </span>
          <span className="text-xs font-normal">{pooled === 1 ? "unit" : "units"} · View cart</span>
        </Link>
      </div>

      {detail.description && <p className="max-w-[72ch] text-sm text-lap-slate">{detail.description}</p>}

      {/* Size variant chips */}
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => selectVariant(v.id)}
            aria-pressed={v.id === variant.id}
            className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors duration-150 ${
              v.id === variant.id
                ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
                : "border-lap-border text-lap-slate hover:border-lap-teal"
            }`}
          >
            {v.size}
          </button>
        ))}
      </div>

      {/* Pricing: current price, full tier band grid, pooling context */}
      <section id="pricing" aria-label="Tier pricing" className="rounded-[10px] border border-lap-border bg-lap-surface p-4 shadow-lap md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] text-lap-slate">{variant.sku}</p>
            {preview.qualifies ? (
              <p className="mt-1 font-mono text-2xl font-semibold text-lap-teal">
                <span data-testid="detail-unit-price">{formatMoney(preview.unitPrice!)}</span>
                <span className="ml-2 font-sans text-xs font-normal text-lap-slate">
                  per unit · Tier {preview.appliedTier?.tier}
                </span>
              </p>
            ) : (
              <p className="mt-1 font-mono text-2xl font-semibold text-lap-ink">
                {variant.entryPrice != null ? formatMoney(variant.entryPrice) : "No price"}
                <span className="ml-2 font-sans text-xs font-normal text-lap-amber">at MOQ {moq}</span>
              </p>
            )}
          </div>
          {inCart && (
            <span className="rounded-full bg-lap-teal-wash px-2.5 py-1 font-mono text-xs font-semibold text-lap-teal">
              {inCart.quantity} in cart
            </span>
          )}
        </div>

        {/* Signature tier ladder: bordered mono bands, active pooled band = teal wash +
            teal-bright bottom underline (never a side stripe). */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 font-mono sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {variant.tierPrices.map((t) => {
            const active = preview.qualifies && preview.appliedTier?.tier === t.tierNumber;
            const range = t.maxQty != null ? `${t.minQty}-${t.maxQty}` : `${t.minQty}+`;
            return (
              <button
                key={t.tierNumber}
                type="button"
                data-testid={`tier-band-${t.tierNumber}`}
                data-active={active || undefined}
                onClick={() => setQuantity(Math.max(1, t.minQty))}
                title={`Set quantity to ${Math.max(1, t.minQty)}`}
                aria-label={`Set quantity to ${Math.max(1, t.minQty)} (${range} units, ${formatMoney(t.unitPrice)} per unit)`}
                className={`rounded-md border border-lap-border px-3 py-2.5 text-left transition-colors duration-150 ${
                  active ? "bg-lap-teal-wash shadow-[inset_0_-2px_0_0_#0DA5BC]" : "hover:border-lap-teal hover:bg-lap-page"
                }`}
              >
                <div className="text-[10px] uppercase text-lap-slate">{t.label}</div>
                <div className="mt-0.5 text-[11px] text-lap-slate">{range} units</div>
                <div className={`mt-1 text-sm font-semibold ${active ? "text-lap-teal" : "text-lap-ink"}`}>
                  {formatMoney(t.unitPrice)}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-lap-slate">
          {detail.category === "CAPSULE"
            ? "Capsules price per SKU and are exempt from cart pooling."
            : `Tier qualification pools across the whole cart: ${pooled} ${pooled === 1 ? "unit" : "units"} in the cart now, ${pooled + quantity} with this line.`}
        </p>

        {history && (
          <p className="mt-1.5 text-xs text-lap-slate">
            Last order: <span className="font-mono font-semibold text-lap-ink">{history.lastQuantity}</span> @{" "}
            <span className="font-mono font-semibold text-lap-ink">{formatMoney(history.lastUnitPrice)}</span> on{" "}
            {formatDate(history.lastDate)}
          </p>
        )}

        {/* Qty stepper + add, bound to the Order Mode cart */}
        <div className="mt-4 flex max-w-sm items-stretch gap-2">
          <div className="flex items-stretch rounded-[10px] border border-lap-border">
            <button
              type="button"
              aria-label={`Decrease quantity of ${detail.name} ${variant.size}`}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-touch w-touch items-center justify-center rounded-l-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <QtyInput
              value={quantity}
              min={1}
              onCommit={setQuantity}
              aria-label={`Quantity of ${detail.name} ${variant.size}`}
              className="w-16 border-x border-lap-border bg-lap-surface text-center font-mono text-sm text-lap-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lap-teal-bright/40"
            />
            <button
              type="button"
              aria-label={`Increase quantity of ${detail.name} ${variant.size}`}
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-touch w-touch items-center justify-center rounded-r-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            data-testid={`detail-add-${variant.sku}`}
            onClick={handleAdd}
            className="min-h-touch flex-1 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark"
          >
            Add to cart
          </button>
        </div>

        {!state.customer && customerHint && (
          <div
            role="status"
            className="mt-3 flex max-w-sm flex-wrap items-center justify-between gap-2 rounded-[10px] border border-lap-amber bg-lap-surface px-3 py-2.5"
          >
            <p className="text-xs text-lap-ink">Choose a customer first so pricing follows their price list.</p>
            <Link
              href="/order?selectCustomer=1"
              className="min-h-touch rounded-[10px] border border-lap-teal px-3 py-2 text-sm font-semibold text-lap-teal transition-colors duration-150 hover:bg-lap-teal-wash"
            >
              Choose customer
            </Link>
          </div>
        )}

        <p className="mt-4 text-[11px] uppercase tracking-wide text-lap-slate">
          For research purposes only - not for human consumption.
        </p>
      </section>

      {/* Other sizes: sibling variants, anchored back to the pricing section */}
      {variants.length > 1 && (
        <section aria-label="Other sizes">
          <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-lap-slate">
            Other sizes
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {variants
              .filter((v) => v.id !== variant.id)
              .map((v) => (
                <a
                  key={v.id}
                  href="#pricing"
                  onClick={() => selectVariant(v.id)}
                  className="rounded-full border border-lap-border px-3.5 py-2 text-sm font-semibold text-lap-slate transition-colors duration-150 hover:border-lap-teal hover:text-lap-teal"
                >
                  {v.size}
                  {v.entryPrice != null && (
                    <span className="ml-1.5 font-mono text-xs font-normal">from {formatMoney(v.entryPrice)}</span>
                  )}
                </a>
              ))}
          </div>
        </section>
      )}

      {/* Same category: deterministic (catalog is name-sorted), links via card titles */}
      <ProductRail title="Same category" products={related} />
    </div>
  );
}
