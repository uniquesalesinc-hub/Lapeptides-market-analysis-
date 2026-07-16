"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { setViewAsRep } from "@/lib/viewAs";
import { isNavItemActive, navItemsForRole, type PortalRole } from "./navItems";
import { AccountIcon, ChevronDownIcon, SearchIcon } from "./icons";

/** id + name only: the layout passes these down for admin sessions exclusively. */
export interface ViewSwitchData {
  reps: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  /** The rep currently being viewed-as, if any. */
  activeRepId: string | null;
}

const ADMIN_NAV_COLLAPSED_KEY = "lap.sidebar.adminNavCollapsed";

/**
 * Deep-teal fixed left rail (DESIGN.md signature pattern). Icons-only at 64px below xl,
 * 232px with labels at xl and up. Hidden below md, where MobileNav takes over.
 *
 * Admin sessions get three sections: "Admin view" (the regular nav, collapsible),
 * "Sales rep view" (enter viewing-as for a rep), and "Customer view" (jump into a
 * Customer 360). Reps see the plain nav exactly as before. The rep/customer sections
 * carry names, so they only render at xl where labels exist; the narrow icon rail keeps
 * just the nav.
 */
export function AppSidebar({ role, viewSwitch }: { role: PortalRole; viewSwitch?: ViewSwitchData }) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN" && !!viewSwitch;
  // While viewing-as, mirror what the rep would see in the nav (admin-only items hidden).
  const items = navItemsForRole(isAdmin && viewSwitch?.activeRepId ? "SALES_REP" : role);

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-16 flex-col bg-lap-teal-dark text-white md:flex xl:w-[232px]">
      <Link
        href="/dashboard"
        className="flex h-14 shrink-0 items-center justify-center gap-2.5 border-b border-white/10 px-3 xl:justify-start xl:px-5"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
          <path d="M12 2L22 20H2L12 2Z" fill="#0DA5BC" />
        </svg>
        <span className="hidden min-w-0 flex-col leading-none xl:flex">
          <span className="font-heading text-[15px] font-semibold tracking-tight text-white">
            LA Peptides
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
            Sales Platform
          </span>
        </span>
        <span className="sr-only xl:hidden">LA Peptides Sales Platform</span>
      </Link>

      <div className="flex-1 overflow-y-auto px-2 py-3 xl:px-3">
        {isAdmin && viewSwitch ? (
          <AdminSections items={items} pathname={pathname} viewSwitch={viewSwitch} />
        ) : (
          <nav aria-label="Primary">
            <NavList items={items} pathname={pathname} />
          </nav>
        )}
      </div>

      <p className="hidden border-t border-white/10 px-5 py-3 text-[10px] uppercase leading-relaxed tracking-wide text-white/40 xl:block">
        For research purposes only - not for human consumption.
      </p>
    </aside>
  );
}

type NavItems = ReturnType<typeof navItemsForRole>;

function NavList({ items, pathname }: { items: NavItems; pathname: string }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = isNavItemActive(item.href, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-touch items-center justify-center gap-3 rounded-[10px] px-2 py-2 text-sm font-medium transition-colors duration-150 xl:justify-start xl:px-3 ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${active ? "text-lap-teal-bright" : ""}`} />
              <span className="hidden truncate xl:inline">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SectionHeading({
  children,
  collapsible,
  collapsed,
  onToggle,
}: {
  children: React.ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const label = (
    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
      {children}
    </span>
  );
  if (!collapsible) return <div className="px-3 pb-1 pt-4">{label}</div>;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="flex w-full items-center justify-between rounded-[8px] px-3 pb-1 pt-4 text-left hover:text-white"
    >
      {label}
      <ChevronDownIcon
        aria-hidden="true"
        className={`h-3.5 w-3.5 text-white/45 transition-transform duration-150 ${collapsed ? "-rotate-90" : ""}`}
      />
    </button>
  );
}

function AdminSections({
  items,
  pathname,
  viewSwitch,
}: {
  items: NavItems;
  pathname: string;
  viewSwitch: ViewSwitchData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("");

  // localStorage read happens post-hydration so server and client first paint agree.
  useEffect(() => {
    setNavCollapsed(window.localStorage.getItem(ADMIN_NAV_COLLAPSED_KEY) === "1");
  }, []);

  const toggleNav = () => {
    setNavCollapsed((prev) => {
      window.localStorage.setItem(ADMIN_NAV_COLLAPSED_KEY, prev ? "0" : "1");
      return !prev;
    });
  };

  const enterRepView = (repId: string) => {
    if (repId === viewSwitch.activeRepId) return;
    startTransition(async () => {
      await setViewAsRep(repId);
      router.refresh();
    });
  };

  const filteredCustomers = useMemo(() => {
    const q = customerFilter.trim().toLowerCase();
    if (!q) return viewSwitch.customers;
    return viewSwitch.customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customerFilter, viewSwitch.customers]);

  return (
    <div>
      {/* Below xl the rail is icons-only, so only the nav renders; the section chrome needs labels. */}
      <div className="xl:hidden">
        <nav aria-label="Primary">
          <NavList items={items} pathname={pathname} />
        </nav>
      </div>

      <div className="hidden xl:block">
        <section aria-label="Admin view">
          <SectionHeading collapsible collapsed={navCollapsed} onToggle={toggleNav}>
            Admin view
          </SectionHeading>
          {!navCollapsed && (
            <nav aria-label="Primary">
              <NavList items={items} pathname={pathname} />
            </nav>
          )}
        </section>

        <section aria-label="Sales rep view">
          <SectionHeading>Sales rep view</SectionHeading>
          <ul className="space-y-0.5">
            {viewSwitch.reps.map((rep) => {
              const active = rep.id === viewSwitch.activeRepId;
              return (
                <li key={rep.id}>
                  <button
                    type="button"
                    onClick={() => enterRepView(rep.id)}
                    disabled={pending}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm font-medium transition-colors duration-150 disabled:opacity-60 ${
                      active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <AccountIcon className={`h-4 w-4 shrink-0 ${active ? "text-lap-teal-bright" : ""}`} />
                    <span className="min-w-0 flex-1 truncate">{rep.name}</span>
                    {active && (
                      <span className="shrink-0 rounded-full bg-lap-teal-bright/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lap-teal-bright">
                        Viewing
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {viewSwitch.reps.length === 0 && (
              <li className="px-3 py-1.5 text-xs text-white/45">No active reps</li>
            )}
          </ul>
        </section>

        <section aria-label="Customer view">
          <SectionHeading>Customer view</SectionHeading>
          <div className="relative mb-1 px-1">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              placeholder="Filter customers"
              aria-label="Filter customers"
              className="w-full rounded-[8px] border border-white/15 bg-white/5 py-1.5 pl-8 pr-2 text-xs text-white placeholder:text-white/40 focus:border-lap-teal-bright focus:outline-none"
            />
          </div>
          <ul className="space-y-0.5">
            {filteredCustomers.map((c) => {
              const href = `/customers/${c.id}`;
              const active = isNavItemActive(href, pathname);
              return (
                <li key={c.id}>
                  <Link
                    href={href}
                    className={`flex items-center rounded-[10px] px-3 py-1.5 text-sm transition-colors duration-150 ${
                      active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                  </Link>
                </li>
              );
            })}
            {filteredCustomers.length === 0 && (
              <li className="px-3 py-1.5 text-xs text-white/45">No matching customers</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
