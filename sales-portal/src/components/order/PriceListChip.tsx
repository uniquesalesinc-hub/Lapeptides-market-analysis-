"use client";

import { useEffect, useRef, useState } from "react";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { ChevronDownIcon } from "@/components/shell/icons";
import type { QuoteLadderCode } from "@/components/quotes/wizard-types";
import { useOrderMode } from "./OrderModeProvider";

const LADDERS: QuoteLadderCode[] = ["BULK_RETAIL", "BULK_WHOLESALE"];

/**
 * Persistent price-ladder chip. Auto-set from the customer's default; manual switching is
 * the exception path and gets an explicit amber "Overridden" state (words, not icon-only).
 */
export function PriceListChip() {
  const { state, setLadder } = useOrderMode();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-touch items-center gap-2.5 rounded-[10px] border border-lap-border bg-lap-surface px-3.5 text-left shadow-lap transition-colors duration-200 hover:border-lap-teal"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-lap-ink">
            {PRICE_LIST_LABELS[state.ladder]}
          </span>
          {state.overridden ? (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-lap-amber">
              <span className="h-1.5 w-1.5 rounded-full bg-lap-amber" aria-hidden="true" />
              Overridden
            </span>
          ) : (
            <span className="block text-[11px] text-lap-slate">
              {state.customer ? "Customer default" : "Price ladder"}
            </span>
          )}
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-lap-slate" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Price ladder"
          className="absolute left-0 top-full z-40 mt-2 w-72 rounded-[10px] border border-lap-border bg-lap-surface p-1.5 shadow-lapDrawer"
        >
          {LADDERS.map((ladder) => {
            const active = ladder === state.ladder;
            const isDefault = state.customer?.defaultPriceListCode === ladder;
            return (
              <button
                key={ladder}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLadder(ladder);
                  setOpen(false);
                }}
                className={`flex min-h-touch w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm transition-colors duration-150 ${
                  active ? "bg-lap-teal-wash font-semibold text-lap-teal" : "text-lap-ink hover:bg-lap-page"
                }`}
              >
                <span>{PRICE_LIST_LABELS[ladder]}</span>
                {isDefault && (
                  <span className="rounded-full bg-lap-teal-wash px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lap-teal">
                    Default
                  </span>
                )}
              </button>
            );
          })}
          <p className="px-3 py-2 text-[11px] leading-snug text-lap-slate">
            Sprays, creams, and capsules always price from their own sheets regardless of ladder.
          </p>
        </div>
      )}
    </div>
  );
}
