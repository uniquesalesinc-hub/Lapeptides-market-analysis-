"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardTab {
  href: string;
  label: string;
  adminOnly?: boolean;
}

const TABS: DashboardTab[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/sales", label: "Sales" },
  { href: "/dashboard/engagement", label: "Engagement" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/leads", label: "Leads", adminOnly: true },
];

/**
 * Shared dashboard tab bar: Home | Sales | Engagement | Tasks | Leads (admin only).
 * Active tab derives from the pathname; each tab is a real route so tabs deep-link.
 */
export function DashboardTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard sections"
      className="mb-6 flex overflow-x-auto rounded-[10px] border border-lap-border bg-lap-surface shadow-lap"
    >
      {TABS.filter((tab) => !tab.adminOnly || isAdmin).map((tab) => {
        const active =
          tab.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
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
