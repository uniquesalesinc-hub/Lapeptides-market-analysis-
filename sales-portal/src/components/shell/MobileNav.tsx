"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isNavItemActive, navItemsForRole, type PortalRole } from "./navItems";
import { CloseIcon, MoreIcon } from "./icons";

const TAB_HREFS = ["/dashboard", "/order", "/quotes", "/customers"];

/** Bottom tab bar below md. Four primary tabs plus a "More" sheet with the rest. */
export function MobileNav({ role }: { role: PortalRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const items = navItemsForRole(role);
  const tabs = TAB_HREFS.map((href) => items.find((i) => i.href === href)!).filter(Boolean);
  const moreItems = items.filter((i) => !TAB_HREFS.includes(i.href));
  const moreActive = moreItems.some((i) => isNavItemActive(i.href, pathname));

  useEffect(() => setMoreOpen(false), [pathname]);

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
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-lap-surface pb-4 shadow-lapDrawer"
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
          </div>
        </div>
      )}
    </>
  );
}
