"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductCategory } from "@prisma/client";
import { calculateQuoteTotals, round2, type AdjustmentInput } from "@/lib/pricing/engine";
import { cartPooledQuantity } from "@/lib/pricing/clientPreview";
import { saveQuoteDraft, acceptQuoteAsOrder } from "@/lib/actions/quote-actions";
import type { QuoteDraftInput } from "@/lib/validation/quote";
import { computeDueDate } from "@/lib/invoiceTerms";
import { formatDate, formatMoney } from "@/lib/format";
import { CloseIcon } from "@/components/shell/icons";
import { useOrderMode } from "./OrderModeProvider";
import { PooledTierBar } from "./PooledTierBar";
import { CartLineRow } from "./CartLineRow";

/**
 * The Order Mode cart: a sticky right rail beside the product grid on xl+ screens, and a
 * bottom sheet opened from the header cart chip below xl. One shared body renders in both
 * containers - all cart state lives in the OrderModeProvider, so the two are always in sync.
 *
 * "Create quote" saves a draft through the EXISTING saveQuoteDraft action (server re-resolves
 * every price). "Create order" additionally chains acceptQuoteAsOrder - the existing
 * quote-auto-accepted model. Both redirect to the created quote's detail page.
 */
export function CartPanel({ sheetOpen, onSheetClose }: { sheetOpen: boolean; onSheetClose: () => void }) {
  useEffect(() => {
    if (!sheetOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onSheetClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen, onSheetClose]);

  return (
    <>
      {/* Desktop: sticky right rail */}
      <aside
        aria-label="Cart"
        className="hidden xl:block xl:sticky xl:top-[72px] xl:max-h-[calc(100dvh-88px)] xl:overflow-y-auto"
      >
        <div className="rounded-[10px] border border-lap-border bg-lap-surface p-4 shadow-lap">
          <h2 className="mb-3 font-heading text-base font-semibold text-lap-ink">Cart</h2>
          <CartBody />
        </div>
      </aside>

      {/* Below xl: bottom sheet from the cart chip */}
      <div className={`xl:hidden ${sheetOpen ? "" : "pointer-events-none"}`} aria-hidden={!sheetOpen}>
        <div
          onClick={onSheetClose}
          className={`fixed inset-0 z-40 bg-lap-teal-dark/30 transition-opacity duration-200 ${
            sheetOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Cart"
          className={`fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-lap-border bg-lap-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lapDrawer transition-transform duration-200 ease-out ${
            sheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-lap-ink">Cart</h2>
            <button
              type="button"
              onClick={onSheetClose}
              aria-label="Close cart"
              className="flex h-touch w-touch items-center justify-center rounded-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <CartBody />
        </section>
      </div>
    </>
  );
}

function CartBody() {
  const { state, catalog, clearCart, defaultExpirationDays } = useOrderMode();
  const router = useRouter();

  const [saving, setSaving] = useState<null | "quote" | "order">(null);
  const [error, setError] = useState<string | null>(null);
  const [blockingApprovals, setBlockingApprovals] = useState<Array<{ label: string; reason: string }>>([]);
  // If a save succeeded but a later step failed, retries UPDATE that draft instead of
  // creating a duplicate quote.
  const draftIdRef = useRef<string | null>(null);

  const categoryByVariant = useMemo(() => {
    const map = new Map<string, ProductCategory>();
    for (const product of catalog) for (const variant of product.variants) map.set(variant.id, product.category);
    return map;
  }, [catalog]);

  // Line discounts ride as quote-level FIXED_AMOUNT adjustments - the exact shape the
  // existing action validates and authorizes against the rep's limit.
  const adjustments = useMemo<AdjustmentInput[]>(
    () =>
      state.cart
        .filter((l) => l.pricing.qualifies && l.discountPercent != null && l.discountPercent > 0)
        .map((l) => ({
          kind: "REP_DISCOUNT" as const,
          label: `Line discount ${l.discountPercent}% - ${l.productName} ${l.strength}`,
          valueType: "FIXED_AMOUNT" as const,
          value: round2((l.pricing.lineTotal! * l.discountPercent!) / 100),
        })),
    [state.cart]
  );

  const totals = useMemo(() => {
    const lineTotals = state.cart.filter((l) => l.pricing.qualifies).map((l) => l.pricing.lineTotal!);
    return calculateQuoteTotals({
      lineTotals,
      adjustments,
      depositPercent: depositPercentFor(state.customer?.paymentTerms) ?? undefined,
    });
  }, [state.cart, adjustments, state.customer]);

  const pooledUnits = cartPooledQuantity(state.cart);
  const sampleUnits = state.cart.reduce((n, l) => (l.isSample ? n + l.quantity : n), 0);
  const customer = state.customer;
  const canSubmit = customer != null && state.cart.length > 0 && saving == null;

  const submit = useCallback(
    async (mode: "quote" | "order") => {
      if (!customer || state.cart.length === 0) return;
      setSaving(mode);
      setError(null);
      setBlockingApprovals([]);
      try {
        const lineNotes = state.cart
          .filter((l) => l.note?.trim())
          .map((l) => `${l.productName} ${l.strength} (${l.sku}): ${l.note!.trim()}`);
        const payload: QuoteDraftInput = {
          quoteId: draftIdRef.current,
          customerId: customer.id,
          priceListCode: state.ladder,
          lineItems: state.cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity, isSample: l.isSample || undefined })),
          adjustments,
          depositPercent: depositPercentFor(customer.paymentTerms),
          expirationDate: new Date(Date.now() + defaultExpirationDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
          paymentTerms: customer.paymentTerms,
          internalNotes: lineNotes.length > 0 ? lineNotes.join("\n") : undefined,
        };
        const saved = await saveQuoteDraft(payload);
        if (!saved.ok || !saved.quoteId) {
          setError(saved.message ?? "Could not save this quote.");
          setBlockingApprovals(saved.blockingApprovals ?? []);
          return;
        }
        draftIdRef.current = saved.quoteId;

        if (mode === "order") {
          const accepted = await acceptQuoteAsOrder(saved.quoteId);
          if (!accepted.ok) {
            setError(accepted.message ?? "Could not create the order.");
            setBlockingApprovals(accepted.blockingApprovals ?? []);
            return;
          }
        }

        clearCart();
        draftIdRef.current = null;
        router.push(`/quotes/${saved.quoteId}`);
      } finally {
        setSaving(null);
      }
    },
    [customer, state.cart, state.ladder, adjustments, defaultExpirationDays, clearCart, router]
  );

  if (state.cart.length === 0) {
    return <p className="py-6 text-center text-sm text-lap-slate">Cart is empty. Add products from the grid.</p>;
  }

  return (
    <div className="space-y-4">
      <PooledTierBar />

      <ul className="divide-y divide-lap-border border-y border-lap-border">
        {state.cart.map((line) => (
          <CartLineRow key={line.variantId} line={line} category={categoryByVariant.get(line.variantId)} />
        ))}
      </ul>

      <div className="space-y-1.5 text-sm" data-testid="cart-totals">
        <div className="flex items-center justify-between text-lap-slate">
          <span>
            {state.cart.length} {state.cart.length === 1 ? "line" : "lines"} ·{" "}
            <span className="font-mono">{pooledUnits}</span> units
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lap-slate">Subtotal</span>
          <span className="font-mono text-lap-ink">{formatMoney(totals.subtotal)}</span>
        </div>
        {sampleUnits > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-lap-slate">Samples</span>
            <span className="font-mono text-lap-amber">{sampleUnits} {sampleUnits === 1 ? "unit" : "units"} free</span>
          </div>
        )}
        {totals.discountTotal !== 0 && (
          <div className="flex items-center justify-between">
            <span className="text-lap-slate">Discounts</span>
            <span className="font-mono text-lap-green">{formatMoney(totals.discountTotal)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-lap-border pt-1.5 font-semibold">
          <span className="text-lap-ink">Total</span>
          <span className="font-mono text-lap-ink" data-testid="cart-total">
            {formatMoney(totals.grandTotal)}
          </span>
        </div>
        {totals.depositAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-lap-slate">Deposit required</span>
            <span className="font-mono text-lap-ink">{formatMoney(totals.depositAmount)}</span>
          </div>
        )}
        {customer && (
          <p className="pt-0.5 text-xs text-lap-slate" data-testid="terms-line">
            {termsLine(customer.paymentTerms)}
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-lap-red/10 px-3 py-2 text-xs font-medium text-lap-red" role="alert">
          {error}
        </p>
      )}
      {blockingApprovals.length > 0 && (
        <div className="rounded-lg bg-lap-amber/10 px-3 py-2 text-xs text-lap-ink">
          <p className="font-semibold text-lap-amber">Awaiting approval</p>
          <ul className="mt-1 list-inside list-disc">
            {blockingApprovals.map((b, i) => (
              <li key={i}>
                {b.label}: {b.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <button
          type="button"
          data-testid="create-quote"
          disabled={!canSubmit}
          onClick={() => submit("quote")}
          className="min-h-touch w-full rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving === "quote" ? "Creating quote…" : "Create quote"}
        </button>
        <button
          type="button"
          data-testid="create-order"
          disabled={!canSubmit}
          onClick={() => submit("order")}
          className="min-h-touch w-full rounded-[10px] border border-lap-teal px-4 text-sm font-semibold text-lap-teal transition-colors duration-150 hover:bg-lap-teal-wash disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving === "order" ? "Creating order…" : "Create order"}
        </button>
        {!customer && <p className="text-center text-xs text-lap-slate">Select a customer to continue.</p>}
      </div>
    </div>
  );
}

/**
 * Mirrors the legacy wizard's default: prepaid business = 100% deposit (full payment up
 * front); Net terms carry no deposit - the balance is due at the Net date instead.
 */
function depositPercentFor(paymentTerms: string | undefined): number | null {
  if (!paymentTerms) return null;
  return /^Net\s+\d+$/i.test(paymentTerms) ? null : 100;
}

function termsLine(paymentTerms: string): string {
  if (/^Net\s+\d+$/i.test(paymentTerms)) {
    return `${paymentTerms}. Due ${formatDate(computeDueDate(paymentTerms))}.`;
  }
  return `${paymentTerms}. Due on receipt.`;
}
