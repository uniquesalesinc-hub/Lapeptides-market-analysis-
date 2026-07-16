"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ReorderRadarRow } from "@/lib/data/reorderRadar";
import { createTaskAction } from "@/lib/actions/task-actions";

function FollowUpButton({ row }: { row: ReorderRadarRow }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const result = await createTaskAction({
        source: "REORDER_RADAR",
        customerId: row.customerId,
        title: `Reorder follow-up: ${row.name}`,
        dueDate: dueDate.toISOString(),
        priority: "MEDIUM",
      });
      if (!result.ok) {
        setState("error");
        setError(result.error ?? "Could not create the task.");
        return;
      }
      setState("done");
    });
  }

  if (state === "done") {
    return (
      <span className="inline-flex min-h-touch shrink-0 items-center rounded-[10px] border border-lap-green/40 bg-lap-green/10 px-3 text-xs font-semibold text-lap-green">
        Task created
      </span>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={create}
        className="min-h-touch rounded-[10px] border border-lap-teal px-3 text-xs font-semibold text-lap-teal transition-colors duration-150 hover:bg-lap-teal-wash disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create follow-up task"}
      </button>
      {error && (
        <p className="text-xs font-medium text-lap-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Reorder radar: customers whose median reorder gap has elapsed since their last order.
 * One click creates a REORDER_RADAR follow-up task due in two days.
 */
export function ReorderRadar({ rows }: { rows: ReorderRadarRow[] }) {
  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
      <div className="border-b border-lap-border px-4 py-3">
        <h2 className="font-heading text-base font-semibold text-lap-ink">Reorder radar</h2>
        <p className="text-xs text-lap-slate">
          Customers past their usual reorder rhythm, computed from at least three confirmed orders.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-lap-slate">
          Nobody is overdue. Customers appear here when their median reorder gap elapses.
        </p>
      ) : (
        <ul className="divide-y divide-lap-border">
          {rows.map((row) => (
            <li key={row.customerId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link
                  href={`/customers/${row.customerId}`}
                  className="text-sm font-medium text-lap-teal hover:underline"
                >
                  {row.name}
                </Link>
                <p className="mt-0.5 text-xs text-lap-slate">
                  median {row.medianGapDays} days, last order {row.daysSinceLast} days ago,{" "}
                  <span className="font-semibold text-lap-red">overdue by {row.overdueBy}</span>
                </p>
              </div>
              <FollowUpButton row={row} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
