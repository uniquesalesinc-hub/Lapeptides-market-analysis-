"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "REFUNDED", "VOIDED"];

export function InvoiceListFilters({
  defaultSearch,
  defaultStatus,
  defaultUnpaid,
}: {
  defaultSearch?: string;
  defaultStatus?: string;
  defaultUnpaid?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(defaultSearch ?? "");
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="space-y-2">
      <input
        type="search"
        inputMode="search"
        placeholder="Search by invoice # or customer…"
        className="input-field"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          update("q", e.target.value);
        }}
      />
      <label className="flex items-center gap-2 text-sm text-lap-slate">
        <input type="checkbox" checked={!!defaultUnpaid} onChange={(e) => update("unpaid", e.target.checked ? "1" : "")} />
        Unpaid only
      </label>
      <div className="table-scroll">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => update("status", "")}
            className={`min-h-touch whitespace-nowrap rounded-full border px-3 text-xs font-semibold ${
              !defaultStatus ? "border-lap-teal bg-lap-teal-wash text-lap-teal" : "border-lap-border text-lap-slate"
            }`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update("status", s)}
              className={`min-h-touch whitespace-nowrap rounded-full border px-3 text-xs font-semibold ${
                defaultStatus === s ? "border-lap-teal bg-lap-teal-wash text-lap-teal" : "border-lap-border text-lap-slate"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
