"use client";

import { useMemo } from "react";
import { selectPricingTier, type TierDefinition } from "@/lib/pricing/engine";
import { cartPooledQuantity } from "@/lib/pricing/clientPreview";
import { useOrderMode } from "./OrderModeProvider";

/**
 * Horizontal strip of the active ladder's tier bands with a proportional teal-bright
 * underline fill for the pooled quantity (DESIGN.md signature: left-to-right underline,
 * never a side stripe). The band the pool qualifies for gets the teal-wash treatment.
 *
 * The pool mirrors the pricing engine exactly: every unit in the cart counts toward tier
 * qualification (capsules count INTO the pool but qualify on their own quantity).
 */
export function PooledTierBar() {
  const { state, catalog } = useOrderMode();

  const pooled = cartPooledQuantity(state.cart);

  // Band structure is ladder-wide; any injectable variant carries the full band list.
  const bands = useMemo(() => {
    const injectable = catalog.find((p) => p.category.startsWith("INJECTABLE_"));
    const tierPrices = injectable?.variants[0]?.tierPrices ?? [];
    const banded = tierPrices.some((t) => t.maxQty != null);
    return tierPrices.map<TierDefinition>((t) => ({
      tier: t.tierNumber,
      label: t.label,
      minimumBasis: banded ? "BAND" : "FLOOR_ONLY",
      minQty: t.minQty,
      maxQty: t.maxQty,
    }));
  }, [catalog]);

  const hasCapsuleLine = state.cart.some((line) =>
    catalog.some((p) => p.category === "CAPSULE" && p.variants.some((v) => v.id === line.variantId))
  );

  if (bands.length === 0) return null;

  const { tier: activeTier } = selectPricingTier(pooled, bands);
  const lowestMin = Math.min(...bands.map((b) => b.minQty));

  return (
    <div className="space-y-2" data-testid="pooled-tier-bar">
      <div className="flex gap-1 font-mono">
        {bands.map((band) => {
          const active = activeTier?.tier === band.tier;
          // Proportional fill within this band; an open-ended top band uses its own
          // minimum as the visual span so the underline still grows, capped at full.
          const span = band.maxQty != null ? band.maxQty - band.minQty + 1 : Math.max(band.minQty, 1);
          const fillFraction = Math.max(0, Math.min(1, (pooled - band.minQty + 1) / span));
          const range = band.maxQty != null ? `${band.minQty}-${band.maxQty}` : `${band.minQty}+`;
          return (
            <div
              key={band.tier}
              className={`relative flex-1 overflow-hidden rounded-md border border-lap-border px-2 py-1.5 text-center ${
                active ? "bg-lap-teal-wash" : "bg-lap-surface"
              }`}
            >
              <div className={`text-[10px] ${active ? "text-lap-teal" : "text-lap-slate"}`}>{range}</div>
              <div className={`text-xs font-semibold ${active ? "text-lap-teal" : "text-lap-ink"}`}>
                T{band.tier}
              </div>
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-0.5 bg-lap-teal-bright transition-[width] duration-200 ease-out"
                style={{ width: `${fillFraction * 100}%` }}
              />
            </div>
          );
        })}
      </div>

      {activeTier ? (
        <p className="text-xs text-lap-slate" data-testid="pooled-caption">
          Pooled quantity: <span className="font-mono font-semibold text-lap-ink">{pooled}</span> bottles.
          Every injectable line prices at <span className="font-semibold text-lap-teal">Tier {activeTier.tier}</span>.
        </p>
      ) : (
        <p className="text-xs font-medium text-lap-amber" data-testid="pooled-caption">
          Pooled quantity: <span className="font-mono font-semibold">{pooled}</span> bottles. Below the{" "}
          {lowestMin}-bottle minimum for this ladder.
        </p>
      )}

      {hasCapsuleLine && (
        <p className="text-[11px] text-lap-slate">Capsule lines are exempt: they price per SKU on their own sheet.</p>
      )}
    </div>
  );
}
