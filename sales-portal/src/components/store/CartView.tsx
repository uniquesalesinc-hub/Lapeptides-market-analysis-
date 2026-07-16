"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QtyInput } from "@/components/order/QtyInput";
import { MinusIcon, PlusIcon } from "@/components/shell/icons";
import { formatMoney } from "@/lib/format";
import { updateClientCartItem, setClientCartItemNote } from "@/lib/actions/client-cart-actions";
import { CLIENT_ORDER_MINIMUM_UNITS } from "@/lib/clientOrder";
import type { PricedClientCart, PricedClientCartLine } from "@/lib/data/clientCart";

/**
 * Interactive cart body. All numbers here arrive pre-priced from the server (the customer's
 * assigned ladder, pooled tier qualification); every mutation is a server action followed by
 * a server re-price, so nothing money-shaped is ever computed in the browser. Steppers and
 * the qty field share the rep cart's QtyInput commit semantics.
 */

function CartLine({
  line,
  disabled,
  onMutate,
}: {
  line: PricedClientCartLine;
  disabled: boolean;
  onMutate: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [note, setNote] = useState(line.note ?? "");
  const [noteOpen, setNoteOpen] = useState(Boolean(line.note));

  function commitQty(quantity: number) {
    onMutate(() => updateClientCartItem({ itemId: line.itemId, quantity }));
  }

  function commitNote() {
    if ((line.note ?? "") === note.trim()) return;
    onMutate(() => setClientCartItemNote({ itemId: line.itemId, note }));
  }

  return (
    <li className="px-5 py-4" data-testid={`cart-line-${line.sku}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/store/products/${line.productId}`}
            className="font-heading text-sm font-semibold text-lap-ink hover:text-lap-teal"
          >
            {line.productName} <span className="font-sans font-normal text-lap-slate">{line.size}</span>
          </Link>
          <p className="mt-0.5 font-mono text-[11px] text-lap-slate">{line.sku}</p>
          {line.tierLabel && (
            <p className="mt-1 text-xs text-lap-slate" data-testid={`cart-tier-${line.sku}`}>
              {line.tierLabel}
            </p>
          )}
          {!line.qualifies && (
            <p className="mt-1 text-xs font-medium text-[#9A6318]" role="alert">
              {line.warning ?? "This line does not qualify for pricing yet."}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-stretch rounded-[10px] border border-lap-border">
            <button
              type="button"
              aria-label={`Decrease quantity of ${line.productName} ${line.size}`}
              disabled={disabled}
              onClick={() => commitQty(Math.max(0, line.quantity - 1))}
              className="flex h-touch w-touch items-center justify-center rounded-l-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink disabled:opacity-50"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <QtyInput
              value={line.quantity}
              min={1}
              onCommit={(next) => {
                if (next !== line.quantity) commitQty(next);
              }}
              aria-label={`Quantity of ${line.productName} ${line.size}`}
              data-testid={`cart-qty-${line.sku}`}
              className="w-14 border-x border-lap-border bg-lap-surface text-center font-mono text-sm text-lap-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lap-teal-bright/40"
            />
            <button
              type="button"
              aria-label={`Increase quantity of ${line.productName} ${line.size}`}
              disabled={disabled}
              onClick={() => commitQty(line.quantity + 1)}
              className="flex h-touch w-touch items-center justify-center rounded-r-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="w-24 text-right">
            {line.unitPrice != null ? (
              <>
                <p className="font-mono text-sm font-semibold text-lap-ink" data-testid={`cart-line-total-${line.sku}`}>
                  {formatMoney(line.lineTotal ?? 0)}
                </p>
                <p className="font-mono text-[11px] text-lap-slate" data-testid={`cart-unit-price-${line.sku}`}>
                  {formatMoney(line.unitPrice)}/unit
                </p>
              </>
            ) : (
              <p className="font-mono text-sm text-lap-slate">-</p>
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => commitQty(0)}
            className="text-xs font-semibold text-lap-slate transition-colors duration-150 hover:text-lap-red disabled:opacity-50"
            aria-label={`Remove ${line.productName} ${line.size} from cart`}
            data-testid={`cart-remove-${line.sku}`}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-2">
        {noteOpen ? (
          <input
            type="text"
            value={note}
            maxLength={500}
            placeholder="Note for this line (labeling, lot preferences...)"
            onChange={(e) => setNote(e.target.value)}
            onBlur={commitNote}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            aria-label={`Note for ${line.productName} ${line.size}`}
            data-testid={`cart-note-${line.sku}`}
            className="w-full max-w-md rounded-[10px] border border-lap-border bg-lap-page px-3 py-2 text-xs text-lap-ink placeholder:text-lap-slate/60 focus:border-lap-teal focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="text-xs font-medium text-lap-teal hover:underline"
          >
            + Add a note
          </button>
        )}
      </div>
    </li>
  );
}

export function CartView({ cart }: { cart: PricedClientCart }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const underMinimum = cart.minimumShortfall > 0;
  const checkoutBlocked = underMinimum || !cart.allLinesQualify || cart.items.length === 0;

  function onMutate(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong. Please try again.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-lap-border rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
        {cart.items.map((line) => (
          <CartLine key={line.itemId} line={line} disabled={isPending} onMutate={onMutate} />
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-lap-red">
          {error}
        </p>
      )}

      <div className="rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap">
        <div className="flex items-center justify-between text-sm">
          <span className="text-lap-slate">
            {cart.totalUnits} {cart.totalUnits === 1 ? "unit" : "units"} across {cart.items.length}{" "}
            {cart.items.length === 1 ? "line" : "lines"}
          </span>
          <span className="rounded-full bg-lap-teal-wash px-3 py-1 text-[11px] font-medium text-lap-teal">
            Your pricing · {cart.ladderName}
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t border-lap-border pt-3">
          <span className="text-sm font-semibold text-lap-ink">Subtotal</span>
          <span className="font-mono text-xl font-semibold text-lap-ink" data-testid="cart-subtotal">
            {formatMoney(cart.subtotal)}
          </span>
        </div>
        <p className="mt-2 text-xs text-lap-slate">
          Tier qualification pools across your whole order ({cart.totalUnits} units), so every
          line above is priced at the band your combined quantity earns. Capsules price per SKU.
        </p>

        {underMinimum && (
          <p
            className="mt-3 rounded-[10px] border border-lap-amber/40 bg-lap-amber/10 px-4 py-3 text-sm font-medium text-[#9A6318]"
            role="alert"
            data-testid="cart-minimum-notice"
          >
            Order minimum is {CLIENT_ORDER_MINIMUM_UNITS} units. Add {cart.minimumShortfall} more{" "}
            {cart.minimumShortfall === 1 ? "unit" : "units"} to check out.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/store" className="text-sm font-semibold text-lap-teal hover:underline">
            Continue shopping
          </Link>
          {checkoutBlocked ? (
            <button type="button" disabled className="btn-primary px-6 text-sm" data-testid="cart-checkout">
              Proceed to checkout
            </button>
          ) : (
            <Link href="/store/checkout" className="btn-primary px-6 text-sm" data-testid="cart-checkout">
              Proceed to checkout
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
