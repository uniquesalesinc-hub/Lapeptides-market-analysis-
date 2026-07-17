"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { OpenClientCartRow } from "@/lib/data/clientCarts";
import { createTaskAction } from "@/lib/actions/task-actions";
import { formatDate, formatMoney } from "@/lib/format";

function FollowUpButton({ row }: { row: OpenClientCartRow }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const result = await createTaskAction({
        source: "ABANDONED_CART",
        customerId: row.customerId,
        title: `Client cart follow-up: ${row.customerName}`,
        dueDate: dueDate.toISOString(),
        priority: "MEDIUM",
        // The customer's rep owns the follow-up; the card is admin-only, and only
        // admins may assign tasks to someone else, so this always passes the action.
        assigneeId: row.assignedRepId,
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
        data-testid={`cart-followup-${row.cartId}`}
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

function CartRow({ row }: { row: OpenClientCartRow }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="px-4 py-3" data-testid={`open-cart-${row.cartId}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/customers/${row.customerId}`}
            className="text-sm font-medium text-lap-teal hover:underline"
          >
            {row.customerName}
          </Link>
          <p className="mt-0.5 text-xs text-lap-slate">
            {row.portalUserName} · {row.itemCount} {row.itemCount === 1 ? "item" : "items"},{" "}
            {row.totalUnits} units ·{" "}
            <span className="font-mono font-semibold text-lap-ink">{formatMoney(row.subtotal)}</span>{" "}
            at today&apos;s prices · updated {formatDate(row.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            data-testid={`cart-contents-${row.cartId}`}
            className="min-h-touch rounded-[10px] border border-lap-border px-3 text-xs font-semibold text-lap-slate transition-colors duration-150 hover:bg-lap-page"
          >
            {open ? "Hide contents" : "Contents"}
          </button>
          <FollowUpButton row={row} />
        </div>
      </div>

      {open && (
        <div className="mt-3 rounded-[10px] border border-lap-border bg-lap-page px-3 py-2">
          <ul className="divide-y divide-lap-border">
            {row.lines.map((line, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="min-w-0 truncate text-lap-ink">
                  {line.productName} <span className="text-lap-slate">{line.size}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-lap-slate">
                  {line.quantity} x{" "}
                  {line.unitPrice !== null ? formatMoney(line.unitPrice) : "unpriced"}
                  {line.lineTotal !== null && (
                    <span className="ml-2 font-semibold text-lap-ink">{formatMoney(line.lineTotal)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-lap-slate">
            Priced on {row.ladderName} at current prices. Nothing is locked in until checkout.
          </p>
        </div>
      )}
    </li>
  );
}

/**
 * Admin-only abandoned-cart radar: open client carts (portal-user carts with items),
 * newest activity first, valued at today's prices on each customer's assigned ladder.
 * One click hands the customer's rep an ABANDONED_CART follow-up task due in two days.
 */
export function OpenClientCarts({ rows, totalCount }: { rows: OpenClientCartRow[]; totalCount: number }) {
  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
      <div className="border-b border-lap-border px-4 py-3">
        <h2 className="font-heading text-base font-semibold text-lap-ink">Open client carts</h2>
        <p className="text-xs text-lap-slate">
          Portal buyers with items sitting in a cart. Values reflect current pricing on their ladder.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-lap-slate">
          No open carts right now. Client carts appear here as soon as a buyer adds an item.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-lap-border">
            {rows.map((row) => (
              <CartRow key={row.cartId} row={row} />
            ))}
          </ul>
          {totalCount > rows.length && (
            <div className="border-t border-lap-border px-4 py-2.5">
              <Link
                href="/dashboard/client-carts"
                className="text-xs font-semibold text-lap-teal hover:underline"
              >
                View all {totalCount} open carts
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
