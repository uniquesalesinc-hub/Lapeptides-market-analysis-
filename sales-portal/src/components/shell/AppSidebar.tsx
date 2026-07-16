"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, navItemsForRole, type PortalRole } from "./navItems";

/**
 * Deep-teal fixed left rail (DESIGN.md signature pattern). Icons-only at 64px below xl,
 * 232px with labels at xl and up. Hidden below md, where MobileNav takes over.
 */
export function AppSidebar({ role }: { role: PortalRole }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

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

      <nav className="flex-1 overflow-y-auto px-2 py-3 xl:px-3" aria-label="Primary">
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
                  <item.icon
                    className={`h-5 w-5 shrink-0 ${active ? "text-lap-teal-bright" : ""}`}
                  />
                  <span className="hidden truncate xl:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="hidden border-t border-white/10 px-5 py-3 text-[10px] uppercase leading-relaxed tracking-wide text-white/40 xl:block">
        For research purposes only - not for human consumption.
      </p>
    </aside>
  );
}
