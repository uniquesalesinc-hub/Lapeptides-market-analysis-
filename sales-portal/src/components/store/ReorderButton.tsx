"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderClientQuote } from "@/lib/actions/client-order-actions";

/**
 * One-click reorder: rebuilds the client's cart from this past order's lines (server-side,
 * scoped to their own customer) and lands them on the cart, where everything reprices on
 * today's lists. Replaces the current cart contents - the button copy says so.
 */
export function ReorderButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reorder() {
    setError(null);
    startTransition(async () => {
      const result = await reorderClientQuote(quoteId);
      if (result.ok) {
        router.push("/store/cart");
      } else {
        setError(result.message ?? "Could not rebuild your cart.");
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={reorder}
        disabled={isPending}
        className="btn-secondary px-5 text-sm"
        data-testid="reorder-button"
        title="Replaces anything currently in your cart"
      >
        {isPending ? "Rebuilding cart..." : "Reorder these items"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-lap-red">
          {error}
        </span>
      )}
    </span>
  );
}
