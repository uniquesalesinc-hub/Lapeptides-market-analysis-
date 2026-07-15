"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreMenu } from "./MoreMenu";

const PRIMARY_ITEMS: Array<{
  href: string;
  label: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  emphasize?: boolean;
}> = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/quotes", label: "Quotes", icon: QuoteIcon },
  { href: "/quotes/new", label: "New Quote", icon: PlusIcon, emphasize: true },
  { href: "/customers", label: "Customers", icon: CustomersIcon },
];

export function BottomNav({ role }: { role: "ADMIN" | "SALES_REP" }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-brand-surface/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
          {PRIMARY_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            if (item.emphasize) {
              return (
                <li key={item.href} className="flex flex-1 items-center justify-center">
                  <Link
                    href={item.href}
                    className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-teal text-brand-navy shadow-card"
                    aria-label={item.label}
                  >
                    <item.icon className="h-6 w-6" />
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.href} className="flex flex-1">
                <Link
                  href={item.href}
                  className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-1 text-xs ${
                    active ? "text-brand-teal" : "text-brand-slate-400"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-1 text-xs text-brand-slate-400"
            >
              <MoreIcon className="h-5 w-5" />
              More
            </button>
          </li>
        </ul>
      </nav>
      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} role={role} />
    </>
  );
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function QuoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6M9 8h3" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function CustomersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2c2.6.4 4.5 2.7 4.5 5.8" strokeLinecap="round" />
    </svg>
  );
}
function MoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
