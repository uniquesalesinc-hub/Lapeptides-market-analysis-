"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { setViewAsRep } from "@/lib/viewAs";
import { isNavItemActive, navItemsForRole, type PortalRole } from "./navItems";
import type { ViewSwitchData } from "./AppSidebar";
import { AccountIcon, CloseIcon, MoreIcon, SearchIcon } from "./icons";

const TAB_HREFS = ["/dashboard", "/order", "/quotes", "/customers"];

/** Bottom tab bar below md. Four primary tabs plus a "More" sheet with the rest. */
export function MobileNav({ role, viewSwitch }: { role: PortalRole; viewSwitch?: ViewSwitchData }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [customerFilter, setCustomerFilter] = useState("");

  const isAdmin = role === "ADMIN" && !!viewSwitch;
  // While viewing-as, mirror the rep's nav (admin-only items hidden) for fidelity.
  const items = navItemsForRole(isAdmin && viewSwitch?.activeRepId ? "SALES_REP" : role);
  const tabs = TAB_HREFS.map((href) => items.find((i) => i.href === href)!).filter(Boolean);
  const moreItems = items.filter((i) => !TAB_HREFS.includes(i.href));
  const moreActive = moreItems.some((i) => isNavItemActive(i.href, pathname));

  useEffect(() => setMoreOpen(false), [pathname]);

  const enterRepView = (repId: string) => {
    if (repId === viewSwitch?.activeRepId) return;
    startTransition(async () => {
      await setViewAsRep(repId);
      setMoreOpen(false);
      router.refresh();
    });
  };

  const filteredCustomers = useMemo(() => {
    if (!viewSwitch) return [];
    const q = customerFilter.trim().toLowerCase();
    if (!q) return viewSwitch.customers;
    return viewSwitch.customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customerFilter, viewSwitch]);

  return (
    <>
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-lap-border bg-lap-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <ul className="flex items-stretch justify-between px-1">
          {tabs.map((item) => {
            const active = isNavItemActive(item.href, pathname);
            return (
              <li key={item.href} className="flex flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium ${
                    active ? "text-lap-teal" : "text-lap-slate"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label === "Order Mode" ? "Order" : item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium ${
                moreActive ? "text-lap-teal" : "text-lap-slate"
              }`}
            >
              <MoreIcon className="h-5 w-5" />
              More
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="More navigation">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-lap-teal-dark/40"
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-lap-surface pb-4 shadow-lapDrawer"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
          >
            <div className="flex items-center justify-between px-5 pb-1 pt-4">
              <p className="font-heading text-sm font-semibold text-lap-ink">More</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-lap-slate hover:bg-lap-teal-wash"
              >
                <CloseIcon className="h-[18px] w-[18px]" />
              </button>
            </div>
            <ul className="px-3">
              {moreItems.map((item) => {
                const active = isNavItemActive(item.href, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex min-h-touch items-center gap-3 rounded-[10px] px-3 text-sm font-medium ${
                        active ? "bg-lap-teal-wash text-lap-teal" : "text-lap-ink hover:bg-lap-page"
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${active ? "text-lap-teal" : "text-lap-slate"}`} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {isAdmin && viewSwitch && (
              <>
                <section aria-label="Sales rep view" className="px-3 pt-3">
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-lap-slate">
                    Sales rep view
                  </p>
                  <ul>
                    {viewSwitch.reps.map((rep) => {
                      const active = rep.id === viewSwitch.activeRepId;
                      return (
                        <li key={rep.id}>
                          <button
                            type="button"
                            onClick={() => enterRepView(rep.id)}
                            disabled={pending}
                            aria-pressed={active}
                            className={`flex min-h-touch w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium disabled:opacity-60 ${
                              active ? "bg-lap-teal-wash text-lap-teal" : "text-lap-ink hover:bg-lap-page"
                            }`}
                          >
                            <AccountIcon className={`h-5 w-5 ${active ? "text-lap-teal" : "text-lap-slate"}`} />
                            <span className="min-w-0 flex-1 truncate">{rep.name}</span>
                            {active && (
                              <span className="shrink-0 rounded-full bg-lap-teal px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                Viewing
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                    {viewSwitch.reps.length === 0 && (
                      <li className="px-3 py-2 text-xs text-lap-slate">No active reps</li>
                    )}
                  </ul>
                </section>

                <section aria-label="Customer view" className="px-3 pt-3">
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-lap-slate">
                    Customer view
                  </p>
                  <div className="relative mb-1 px-1">
                    <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-lap-slate" />
                    <input
                      type="search"
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      placeholder="Filter customers"
                      aria-label="Filter customers"
                      className="w-full rounded-[8px] border border-lap-border bg-lap-page py-1.5 pl-8 pr-2 text-sm text-lap-ink placeholder:text-lap-slate focus:border-lap-teal-bright focus:outline-none"
                    />
                  </div>
                  <ul>
                    {filteredCustomers.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/customers/${c.id}`}
                          className="flex min-h-touch items-center rounded-[10px] px-3 text-sm text-lap-ink hover:bg-lap-page"
                        >
                          <span className="truncate">{c.name}</span>
                        </Link>
                      </li>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <li className="px-3 py-2 text-xs text-lap-slate">No matching customers</li>
                    )}
                  </ul>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
