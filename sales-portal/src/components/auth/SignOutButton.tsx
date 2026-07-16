"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="hidden min-h-touch items-center rounded-[10px] border border-lap-border bg-lap-surface px-3 text-sm font-medium text-lap-slate transition-colors hover:border-lap-teal hover:text-lap-teal sm:inline-flex"
    >
      Sign out
    </button>
  );
}
