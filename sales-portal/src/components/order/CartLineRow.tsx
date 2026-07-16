"use client";

import { useState } from "react";
import type { ProductCategory } from "@prisma/client";
import type { CartLine } from "@/components/quotes/wizard-types";
import { formatMoney } from "@/lib/format";
import { MinusIcon, PlusIcon, CloseIcon } from "@/components/shell/icons";
import { QtyInput } from "./QtyInput";
import { useOrderMode } from "./OrderModeProvider";

const FLAT_CATEGORIES: ReadonlySet<ProductCategory> = new Set([
  "NASAL_SPRAY",
  "TOPICAL_CREAM",
  "CAPSULE",
] as ProductCategory[]);

/**
 * One cart line: name + size, 44px qty stepper, mono unit price + line total, tier chip
 * ("T2 pooled" for injectables, "Flat" for spray/cream/capsule), amber under-MOQ warning,
 * and inline-expanding note + line-discount inputs. The discount chip mirrors the rep's
 * personal limit; the server re-validates on save, so this is signal, never enforcement.
 */
export function CartLineRow({ line, category }: { line: CartLine; category: ProductCategory | undefined }) {
  const { setQty, removeLine, setLineNote, setLineDiscount, discountLimitPercent } = useOrderMode();
  const [noteOpen, setNoteOpen] = useState(Boolean(line.note));
  const [discountOpen, setDiscountOpen] = useState(line.discountPercent != null);

  const flat = category != null && FLAT_CATEGORIES.has(category);
  const qualifies = line.pricing.qualifies;
  const overLimit = line.discountPercent != null && line.discountPercent > discountLimitPercent;
  const discountAmount =
    qualifies && line.discountPercent ? (line.pricing.lineTotal! * line.discountPercent) / 100 : 0;

  return (
    <li className="space-y-2 py-3" data-testid={`cart-line-${line.sku}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-lap-ink">
            {line.productName} <span className="font-normal text-lap-slate">{line.strength}</span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] text-lap-slate">{line.sku}</span>
            {line.isSample ? (
              <span className="rounded-full bg-lap-amber/15 px-2 py-0.5 text-[10px] font-semibold text-lap-amber">
                Sample
              </span>
            ) : qualifies ? (
              <span className="rounded-full bg-lap-teal-wash px-2 py-0.5 font-mono text-[10px] font-semibold text-lap-teal">
                {flat ? "Flat" : `T${line.pricing.appliedTier?.tier} pooled`}
              </span>
            ) : (
              <span className="rounded-full bg-lap-amber/15 px-2 py-0.5 text-[10px] font-semibold text-lap-amber">
                Below minimum
              </span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {qualifies ? (
            <>
              <p className="font-mono text-sm font-semibold text-lap-ink" data-testid={`unit-price-${line.sku}`}>
                {formatMoney(line.pricing.unitPrice!)}
              </p>
              <p className="font-mono text-[11px] text-lap-slate">{formatMoney(line.pricing.lineTotal!)} line</p>
            </>
          ) : (
            <p className="font-mono text-sm font-semibold text-lap-slate">Not priced</p>
          )}
        </div>
      </div>

      {!qualifies && line.pricing.warning && (
        <p className="rounded-lg bg-lap-amber/10 px-2.5 py-1.5 text-[11px] font-medium text-lap-amber">
          {line.pricing.warning}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-stretch rounded-[10px] border border-lap-border">
          <button
            type="button"
            aria-label={`Decrease quantity of ${line.productName} ${line.strength}`}
            onClick={() => setQty(line.variantId, line.quantity - 1, line.isSample)}
            className="flex h-touch w-touch items-center justify-center rounded-l-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
          >
            <MinusIcon className="h-4 w-4" />
          </button>
          <QtyInput
            value={line.quantity}
            min={0}
            onCommit={(next) => setQty(line.variantId, next, line.isSample)}
            aria-label={`Quantity of ${line.productName} ${line.strength}`}
            data-testid={`qty-${line.sku}`}
            className="w-14 border-x border-lap-border bg-lap-surface text-center font-mono text-sm text-lap-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lap-teal-bright/40"
          />
          <button
            type="button"
            aria-label={`Increase quantity of ${line.productName} ${line.strength}`}
            onClick={() => setQty(line.variantId, line.quantity + 1, line.isSample)}
            className="flex h-touch w-touch items-center justify-center rounded-r-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setNoteOpen((v) => !v)}
          aria-expanded={noteOpen}
          className={`min-h-touch rounded-[10px] border px-3 text-xs font-semibold transition-colors duration-150 ${
            noteOpen || line.note
              ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
              : "border-lap-border text-lap-slate hover:border-lap-teal"
          }`}
        >
          Note
        </button>
        {!line.isSample && (
        <button
          type="button"
          onClick={() => setDiscountOpen((v) => !v)}
          aria-expanded={discountOpen}
          className={`min-h-touch rounded-[10px] border px-3 text-xs font-semibold transition-colors duration-150 ${
            discountOpen || line.discountPercent
              ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
              : "border-lap-border text-lap-slate hover:border-lap-teal"
          }`}
        >
          Discount
        </button>
        )}
        <button
          type="button"
          aria-label={`Remove ${line.productName} ${line.strength} from cart`}
          onClick={() => removeLine(line.variantId, line.isSample)}
          className="ml-auto flex h-touch w-touch items-center justify-center rounded-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-red"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {noteOpen && (
        <input
          type="text"
          value={line.note ?? ""}
          onChange={(e) => setLineNote(line.variantId, e.target.value, line.isSample)}
          placeholder="Line note (internal)"
          aria-label={`Note for ${line.productName} ${line.strength}`}
          className="min-h-touch w-full rounded-[10px] border border-lap-border bg-lap-surface px-3 text-sm text-lap-ink placeholder:text-lap-slate/70 focus:border-lap-teal focus:outline-none focus:ring-2 focus:ring-lap-teal-bright/40"
        />
      )}

      {discountOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              inputMode="decimal"
              value={line.discountPercent ?? ""}
              onChange={(e) =>
                setLineDiscount(line.variantId, e.target.value === "" ? null : Number(e.target.value))
              }
              aria-label={`Discount percent for ${line.productName} ${line.strength}`}
              data-testid={`discount-${line.sku}`}
              className="min-h-touch w-20 rounded-[10px] border border-lap-border bg-lap-surface px-3 text-right font-mono text-sm text-lap-ink focus:border-lap-teal focus:outline-none focus:ring-2 focus:ring-lap-teal-bright/40"
            />
            <span className="text-sm text-lap-slate">% off this line</span>
          </div>
          {discountAmount > 0 && (
            <span className="font-mono text-xs text-lap-slate">-{formatMoney(discountAmount)}</span>
          )}
          {overLimit && (
            <span className="rounded-full bg-lap-amber/15 px-2.5 py-1 text-[11px] font-semibold text-lap-amber">
              Needs management approval
            </span>
          )}
        </div>
      )}
    </li>
  );
}
