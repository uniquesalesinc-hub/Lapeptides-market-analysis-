"use client";

import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { ChevronDownIcon, CustomersIcon } from "@/components/shell/icons";
import { useOrderMode } from "./OrderModeProvider";

/**
 * Persistent customer context chip in the Order Mode header. Guest by default;
 * tapping it opens the customer drawer.
 */
export function CustomerChip({ onOpen }: { onOpen: () => void }) {
  const { state } = useOrderMode();
  const customer = state.customer;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="flex min-h-touch items-center gap-2.5 rounded-[10px] border border-lap-border bg-lap-surface px-3.5 text-left shadow-lap transition-colors duration-200 hover:border-lap-teal"
    >
      <CustomersIcon className="h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 text-lap-teal" aria-hidden="true" />
      {customer ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-lap-ink">{customer.businessName}</span>
          <span className="block truncate text-[11px] text-lap-slate">
            {PRICE_LIST_LABELS[customer.defaultPriceListCode]} default
          </span>
        </span>
      ) : (
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-lap-ink">Guest</span>
          <span className="block text-[11px] text-lap-slate">No customer selected</span>
        </span>
      )}
      <ChevronDownIcon className="h-4 w-4 shrink-0 text-lap-slate" aria-hidden="true" />
    </button>
  );
}
