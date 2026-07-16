"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const STATUSES = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "AWAITING_APPROVAL",
  "APPROVED",
  "DECLINED",
  "EXPIRED",
  "CONVERTED_TO_INVOICE",
  "CANCELLED",
];

export function QuoteListFilters({ defaultSearch, defaultStatus }: { defaultSearch?: string; defaultStatus?: string }) {
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
        placeholder="Search by quote # or customer…"
        className="input-field"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          update("q", e.target.value);
        }}
      />
      <div className="table-scroll">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => update("status", "")}
            className={`min-h-touch whitespace-nowrap rounded-full border px-3 text-xs font-semibold ${
              !defaultStatus ? "border-lap-teal bg-lap-teal-wash text-lap-teal" : "border-lap-border bg-lap-surface text-lap-slate"
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
                defaultStatus === s ? "border-lap-teal bg-lap-teal-wash text-lap-teal" : "border-lap-border bg-lap-surface text-lap-slate"
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
