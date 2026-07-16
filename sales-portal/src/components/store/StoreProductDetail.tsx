"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/data/catalog";
import type { StoreProductDetailData, StoreTierBand, StoreVariantDetail } from "@/lib/data/storeCatalog";
import { addToClientCart } from "@/lib/actions/client-cart-actions";
import { formatMoney } from "@/lib/format";
import { CategoryDot } from "@/components/order/CategoryChips";
import { MinusIcon, PlusIcon } from "@/components/shell/icons";

function bandRange(band: StoreTierBand): string {
  return band.maxQty != null ? `${band.minQty}-${band.maxQty}` : `${band.minQty}+`;
}

/** The band the current quantity falls in (last matching band wins for floor tiers). */
function appliedBand(variant: StoreVariantDetail, quantity: number): number | null {
  let applied: number | null = null;
  for (const band of variant.bands) {
    if (quantity >= band.minQty && (band.maxQty == null || quantity <= band.maxQty)) {
      applied = band.tierNumber;
    }
  }
  return applied;
}

/**
 * Store product page body: size chips, the customer's own tier ladder (or the ladder
 * structure with a login gate when anonymous), and the Task 3 add-to-cart stub that writes
 * into the server-side ClientCart. Pricing shown here is per-line; the checkout (Task 4)
 * reprices the whole cart server-side with pooling, so copy stays honest about that.
 */
export function StoreProductDetail({ detail }: { detail: StoreProductDetailData }) {
  const [selectedId, setSelectedId] = useState<string | undefined>(detail.variants[0]?.id);
  const variant = detail.variants.find((v) => v.id === selectedId) ?? detail.variants[0];
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState<string | null>(null); // variantId of the last confirmed add
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!variant) {
    return (
      <div className="rounded-[10px] border border-lap-border bg-lap-surface p-6 text-sm text-lap-slate shadow-lap">
        Pricing for this product is not available on your account. Contact the LA Peptides team.
      </div>
    );
  }

  const active = appliedBand(variant, quantity);

  function selectVariant(id: string) {
    setSelectedId(id);
    setQuantity(1);
    setAdded(null);
    setError(null);
  }

  function handleAdd() {
    setError(null);
    setAdded(null);
    const variantId = variant!.id;
    startTransition(async () => {
      const result = await addToClientCart({ variantId, quantity });
      if (result.ok) {
        setAdded(variantId);
      } else {
        setError(result.error ?? "Could not add to cart.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-lap-slate">
          <CategoryDot category={detail.category} />
          {CATEGORY_LABELS[detail.category]}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-lap-ink">{detail.name}</h1>
        {detail.description && (
          <p className="mt-3 max-w-[72ch] text-sm text-lap-slate">{detail.description}</p>
        )}
      </div>

      {/* Size chips */}
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-lap-slate">Size</p>
        <div className="flex flex-wrap gap-2">
          {detail.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => selectVariant(v.id)}
              aria-pressed={v.id === variant.id}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                v.id === variant.id
                  ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
                  : "border-lap-border text-lap-slate hover:border-lap-teal"
              }`}
            >
              {v.size}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing ladder */}
      <section
        aria-label="Volume pricing"
        className="rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold text-lap-ink">Volume pricing</h2>
            <p className="mt-0.5 font-mono text-[11px] text-lap-slate">{variant.sku}</p>
          </div>
          {detail.pricingVisible && detail.ladderName && (
            <span className="rounded-full bg-lap-teal-wash px-3 py-1 text-[11px] font-medium text-lap-teal">
              Your pricing · {detail.ladderName}
            </span>
          )}
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-lap-border text-left text-[11px] uppercase tracking-wide text-lap-slate">
              <th scope="col" className="py-2 pr-3 font-medium">Band</th>
              <th scope="col" className="py-2 pr-3 font-medium">Units</th>
              <th scope="col" className="py-2 text-right font-medium">Per unit</th>
            </tr>
          </thead>
          <tbody>
            {variant.bands.map((band) => {
              const isActive = detail.pricingVisible && active === band.tierNumber;
              return (
                <tr
                  key={band.tierNumber}
                  data-testid={`store-band-${band.tierNumber}`}
                  className={`border-b border-lap-border last:border-b-0 ${
                    isActive ? "bg-lap-teal-wash shadow-[inset_0_-2px_0_0_#0DA5BC]" : ""
                  }`}
                >
                  <td className="py-2.5 pr-3 text-lap-ink">{band.label}</td>
                  <td className="py-2.5 pr-3 font-mono text-lap-slate">{bandRange(band)}</td>
                  <td className="py-2.5 text-right">
                    {band.unitPrice != null ? (
                      <span className={`font-mono font-semibold ${isActive ? "text-lap-teal" : "text-lap-ink"}`}>
                        {formatMoney(band.unitPrice)}
                      </span>
                    ) : (
                      <Link href="/store/login" className="text-sm font-semibold text-lap-teal hover:underline">
                        Login to view pricing
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {detail.pricingVisible ? (
          <>
            <p className="mt-3 text-xs text-lap-slate">
              {detail.category === "CAPSULE"
                ? "Capsules price per SKU at the quantity ordered."
                : "Tier qualification pools across your whole order at checkout, so mixed carts can earn deeper bands than a single line suggests."}
            </p>

            {/* Add to cart stub (Task 3): writes {variant, qty} into the server-side cart. */}
            <div className="mt-5 flex max-w-sm items-stretch gap-2">
              <div className="flex items-stretch rounded-[10px] border border-lap-border">
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${detail.name} ${variant.size}`}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-touch w-touch items-center justify-center rounded-l-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => {
                    const next = Math.floor(Number(e.target.value));
                    setQuantity(Number.isFinite(next) && next >= 1 ? next : 1);
                  }}
                  aria-label={`Quantity of ${detail.name} ${variant.size}`}
                  className="w-16 border-x border-lap-border bg-lap-surface text-center font-mono text-sm text-lap-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lap-teal-bright/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                data-testid="store-add-to-cart"
                onClick={handleAdd}
                disabled={isPending}
                className="min-h-touch flex-1 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Adding…" : "Add to cart"}
              </button>
            </div>

            {added === variant.id && !isPending && (
              <p role="status" className="mt-3 text-sm text-lap-green" data-testid="store-added-confirmation">
                Added.{" "}
                <Link href="/store/cart" className="font-semibold text-lap-teal hover:underline">
                  View cart
                </Link>
              </p>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-lap-red">
                {error}
              </p>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-[10px] bg-lap-page p-4">
            <p className="text-sm text-lap-ink">
              Pricing and ordering are available to approved wholesale accounts.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/store/login" className="btn-primary px-5 text-sm">
                Login to view pricing
              </Link>
              <Link href="/store/signup" className="btn-secondary px-5 text-sm">
                Request an account
              </Link>
            </div>
          </div>
        )}

        <p className="mt-5 text-[11px] uppercase tracking-wide text-lap-slate">
          For research purposes only - not for human consumption.
        </p>
      </section>
    </div>
  );
}
