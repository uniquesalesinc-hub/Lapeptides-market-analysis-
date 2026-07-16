"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProductCategory } from "@prisma/client";
import { CATEGORY_LABELS } from "@/lib/data/catalog";
import { CategoryDot } from "@/components/order/CategoryChips";

const STORAGE_KEY = "lap-store-recently-viewed";
const MAX_ENTRIES = 8;

interface RecentEntry {
  id: string;
  name: string;
  category: ProductCategory;
}

function readEntries(): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentEntry =>
        !!e &&
        typeof e === "object" &&
        typeof (e as RecentEntry).id === "string" &&
        typeof (e as RecentEntry).name === "string" &&
        typeof (e as RecentEntry).category === "string" &&
        (e as RecentEntry).category in CATEGORY_LABELS
    );
  } catch {
    return [];
  }
}

/**
 * "Recently viewed" rail on the store product page. Pure localStorage, per browser -
 * works for anonymous visitors and clients alike, renders nothing until mounted (so the
 * server and first client render agree) and never shows prices.
 */
export function RecentlyViewedRail({ current }: { current: RecentEntry }) {
  const [others, setOthers] = useState<RecentEntry[]>([]);

  useEffect(() => {
    const previous = readEntries().filter((e) => e.id !== current.id);
    setOthers(previous.slice(0, MAX_ENTRIES));
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([current, ...previous].slice(0, MAX_ENTRIES + 1))
      );
    } catch {
      // Storage full or blocked: the rail is a nicety, never an error.
    }
  }, [current.id, current.name, current.category]); // eslint-disable-line react-hooks/exhaustive-deps

  if (others.length === 0) return null;

  return (
    <section aria-label="Recently viewed" className="mt-12">
      <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-lap-slate">
        Recently viewed
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {others.map((entry) => (
          <Link
            key={entry.id}
            href={`/store/products/${entry.id}`}
            className="min-w-[200px] shrink-0 rounded-[10px] border border-lap-border bg-lap-surface p-4 shadow-lap transition-shadow duration-200 hover:shadow-lapDrawer"
          >
            <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-lap-slate">
              <CategoryDot category={entry.category} />
              {CATEGORY_LABELS[entry.category]}
            </p>
            <p className="mt-1.5 font-heading text-sm font-semibold text-lap-ink">{entry.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
