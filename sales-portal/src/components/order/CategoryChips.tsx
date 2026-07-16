"use client";

import type { ProductCategory } from "@prisma/client";
import { CATEGORY_LABELS } from "@/lib/data/catalog";

/** Tiny tinted dot per category (DESIGN.md: dots + labels, never colored card backgrounds). */
export const CATEGORY_DOT_COLORS: Record<ProductCategory, string> = {
  INJECTABLE_PEPTIDE: "#0C535E", // teal
  INJECTABLE_GLP: "#0DA5BC", // teal-bright
  INJECTABLE_BLEND: "#2D8A5F", // green
  INJECTABLE_BIOREGULATOR: "#F2A03D", // amber
  NASAL_SPRAY: "#073841", // teal-dark
  TOPICAL_CREAM: "#4A5862", // slate
  CAPSULE: "#C9492A", // red
};

export function CategoryDot({ category, className = "" }: { category: ProductCategory; className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: CATEGORY_DOT_COLORS[category] }}
      aria-hidden="true"
    />
  );
}

export function CategoryChips({
  active,
  onChange,
}: {
  active: ProductCategory | null;
  onChange: (category: ProductCategory | null) => void;
}) {
  return (
    <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2">
        <Chip label="All" selected={active === null} onClick={() => onChange(null)} />
        {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((category) => (
          <Chip
            key={category}
            label={CATEGORY_LABELS[category]}
            dot={category}
            selected={active === category}
            onClick={() => onChange(category)}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  dot,
  selected,
  onClick,
}: {
  label: string;
  dot?: ProductCategory;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-touch shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors duration-150 ${
        selected
          ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
          : "border-lap-border bg-lap-surface text-lap-slate hover:border-lap-teal hover:text-lap-ink"
      }`}
    >
      {dot && <CategoryDot category={dot} />}
      {label}
    </button>
  );
}
