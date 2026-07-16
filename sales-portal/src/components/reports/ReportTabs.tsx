"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/reports", label: "Sales" },
  { href: "/reports/customers", label: "Customers" },
  { href: "/reports/products", label: "Products" },
  { href: "/reports/team", label: "Team" },
];

/**
 * Reports tab bar: Sales | Customers | Products | Team. Same pattern as DashboardTabs;
 * the active filter query string travels with tab switches so the window/rep/customer
 * context is preserved (the products-only ?sort param is dropped).
 */
export function ReportTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const carried = new URLSearchParams(searchParams.toString());
  carried.delete("sort");
  const query = carried.toString();

  return (
    <nav
      aria-label="Report sections"
      className="mb-6 flex overflow-x-auto rounded-[10px] border border-lap-border bg-lap-surface shadow-lap"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/reports" ? pathname === "/reports" : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={query ? `${tab.href}?${query}` : tab.href}
            aria-current={active ? "page" : undefined}
            className={`min-h-touch flex shrink-0 items-center border-b-2 px-4 text-sm font-medium transition-colors duration-150 ${
              active
                ? "border-lap-teal-bright bg-lap-teal-wash text-lap-teal"
                : "border-transparent text-lap-slate hover:text-lap-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
