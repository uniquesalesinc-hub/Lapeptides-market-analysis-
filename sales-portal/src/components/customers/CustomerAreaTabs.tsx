"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface CustomerAreaTab {
  href: string;
  label: string;
  adminOnly?: boolean;
}

// Leads deliberately links into the dashboard: the inbox lives at /dashboard/leads (Phase 1)
// and is not duplicated here — this tab is a cross-link, not a second surface.
const TABS: CustomerAreaTab[] = [
  { href: "/customers", label: "Customers" },
  { href: "/dashboard/leads", label: "Leads", adminOnly: true },
  { href: "/customers/portal-users", label: "Portal Users", adminOnly: true },
];

/**
 * Customers-area tab bar (Customers | Leads | Portal Users), styled to match DashboardTabs.
 * The Customers tab stays active on customer detail pages but yields to Portal Users.
 */
export function CustomerAreaTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Customer sections"
      className="mb-6 flex overflow-x-auto rounded-[10px] border border-lap-border bg-lap-surface shadow-lap"
    >
      {TABS.filter((tab) => !tab.adminOnly || isAdmin).map((tab) => {
        const active =
          tab.href === "/customers"
            ? pathname === "/customers" ||
              (pathname.startsWith("/customers/") && !pathname.startsWith("/customers/portal-users"))
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
