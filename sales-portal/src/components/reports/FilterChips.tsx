"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export interface FilterOption {
  id: string;
  name: string;
}

const PRICE_LIST_OPTIONS = [
  { value: "BULK_RETAIL", label: "Bulk Retail" },
  { value: "BULK_WHOLESALE", label: "Bulk Wholesale" },
];

function toDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Time-range presets write ?from= (and clear ?to=); "All" clears both. */
function presets(now: Date): Array<{ label: string; from: string | null }> {
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  return [
    { label: "This month", from: toDay(new Date(now.getFullYear(), now.getMonth(), 1)) },
    { label: "Last 30d", from: toDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) },
    { label: "Quarter", from: toDay(new Date(now.getFullYear(), quarterStartMonth, 1)) },
    { label: "Year", from: toDay(new Date(now.getFullYear(), 0, 1)) },
    { label: "All", from: null },
  ];
}

/**
 * Report filter row: time-range preset chips plus rep / customer / price list selects.
 * All state lives in the URL search params so filters survive tab switches and reloads.
 */
export function FilterChips({ reps, customers }: { reps: FilterOption[]; customers: FilterOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const apply = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  const currentFrom = searchParams.get("from");
  const currentTo = searchParams.get("to");
  const rangeChips = presets(new Date());
  const selectClass =
    "min-h-touch rounded-[10px] border border-lap-border bg-lap-surface px-3 text-sm text-lap-ink focus:outline-none focus:ring-2 focus:ring-lap-teal-bright";

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Time range">
        {rangeChips.map((preset) => {
          const active = preset.from === null ? !currentFrom && !currentTo : currentFrom === preset.from && !currentTo;
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={active}
              onClick={() => apply({ from: preset.from, to: null })}
              className={`min-h-touch rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 ${
                active
                  ? "border-lap-teal/30 bg-lap-teal-wash text-lap-teal"
                  : "border-lap-border bg-lap-surface text-lap-slate hover:text-lap-ink"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <select
        aria-label="Representative"
        className={selectClass}
        value={searchParams.get("repId") ?? ""}
        onChange={(e) => apply({ repId: e.target.value || null })}
      >
        <option value="">All reps</option>
        {reps.map((rep) => (
          <option key={rep.id} value={rep.id}>
            {rep.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Customer"
        className={selectClass}
        value={searchParams.get("customerId") ?? ""}
        onChange={(e) => apply({ customerId: e.target.value || null })}
      >
        <option value="">All customers</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Price list"
        className={selectClass}
        value={searchParams.get("priceList") ?? ""}
        onChange={(e) => apply({ priceList: e.target.value || null })}
      >
        <option value="">All price lists</option>
        {PRICE_LIST_OPTIONS.map((pl) => (
          <option key={pl.value} value={pl.value}>
            {pl.label}
          </option>
        ))}
      </select>
    </div>
  );
}
