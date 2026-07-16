"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { clearViewAs } from "@/lib/viewAs";

/**
 * Persistent amber bar shown under the TopBar while an admin is viewing the portal as a
 * rep. Amber carries explicit words (DESIGN.md): the state is spelled out, never icon-only.
 */
export function ViewAsBanner({ repName }: { repName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const exit = () => {
    startTransition(async () => {
      await clearViewAs();
      router.refresh();
    });
  };

  return (
    <div
      role="status"
      className="no-print sticky top-14 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-lap-amber/60 bg-lap-amber/15 px-4 py-2 md:px-8"
    >
      <p className="text-sm text-lap-ink">
        <span className="font-semibold">Viewing as {repName}.</span> Data is scoped to their
        book. Actions you take are still recorded as you.
      </p>
      <button
        type="button"
        onClick={exit}
        disabled={pending}
        className="shrink-0 rounded-[8px] border border-lap-amber bg-lap-surface px-3 py-1 text-xs font-semibold text-lap-ink transition-colors duration-150 hover:bg-lap-amber/25 disabled:opacity-60"
      >
        {pending ? "Exiting..." : "Exit rep view"}
      </button>
    </div>
  );
}
