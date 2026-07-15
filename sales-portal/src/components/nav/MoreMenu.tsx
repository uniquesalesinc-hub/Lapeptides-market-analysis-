"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

const REP_LINKS = [
  { href: "/invoices", label: "Invoices" },
  { href: "/products", label: "Products" },
  { href: "/account", label: "Account" },
];

const ADMIN_LINKS = [
  { href: "/reps", label: "Sales Reps" },
  { href: "/pricing", label: "Pricing" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function MoreMenu({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  role: "ADMIN" | "SALES_REP";
}) {
  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className="relative w-full rounded-t-2xl border-t border-brand-border bg-brand-surface p-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-brand-border" />
        <ul className="space-y-1">
          {REP_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onClose}
                className="flex min-h-touch items-center rounded-lg px-3 text-brand-slate-100 hover:bg-brand-surfaceAlt"
              >
                {link.label}
              </Link>
            </li>
          ))}
          {role === "ADMIN" && (
            <>
              <li className="my-2 border-t border-brand-border pt-2 text-xs font-semibold uppercase tracking-wide text-brand-slate-400">
                Administration
              </li>
              {ADMIN_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="flex min-h-touch items-center rounded-lg px-3 text-brand-slate-100 hover:bg-brand-surfaceAlt"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </>
          )}
          <li className="mt-2 border-t border-brand-border pt-2">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex min-h-touch w-full items-center rounded-lg px-3 text-left text-brand-danger hover:bg-brand-danger/10"
            >
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
