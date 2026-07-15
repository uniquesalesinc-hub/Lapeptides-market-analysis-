"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="hidden min-h-touch items-center rounded-lg border border-brand-border px-3 text-sm text-brand-slate-300 sm:inline-flex"
    >
      Sign out
    </button>
  );
}
