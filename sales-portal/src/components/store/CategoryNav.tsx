"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ProductCategory } from "@prisma/client";
import { CATEGORY_LABELS } from "@/lib/data/catalog";
import { CategoryDot } from "@/components/order/CategoryChips";

/**
 * Storefront category nav row: the seven catalog categories as real links
 * (/store?category=X), so browsing works without JavaScript and each view is a
 * shareable URL. Lives in the store masthead under the wordmark row.
 */
export function CategoryNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname === "/store" ? searchParams.get("category") : null;
  const onStoreHome = pathname === "/store";

  return (
    <nav
      aria-label="Product categories"
      className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-4 sm:px-6">
        <CategoryLink href="/store" label="All products" selected={onStoreHome && active === null} />
        {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((category) => (
          <CategoryLink
            key={category}
            href={`/store?category=${category}`}
            label={CATEGORY_LABELS[category]}
            dot={category}
            selected={active === category}
          />
        ))}
      </div>
    </nav>
  );
}

function CategoryLink({
  href,
  label,
  dot,
  selected,
}: {
  href: string;
  label: string;
  dot?: ProductCategory;
  selected: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`flex min-h-touch shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors duration-150 ${
        selected
          ? "border-lap-teal-bright text-lap-teal"
          : "border-transparent text-lap-slate hover:text-lap-ink"
      }`}
    >
      {dot && <CategoryDot category={dot} />}
      {label}
    </Link>
  );
}
