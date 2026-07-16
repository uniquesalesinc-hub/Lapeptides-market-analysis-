"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { placeClientOrder } from "@/lib/actions/client-order-actions";
import { CLIENT_RUO_ACKNOWLEDGMENT } from "@/lib/clientOrder";
import type { PricedClientCart } from "@/lib/data/clientCart";

/**
 * Two-step checkout: Shipping (freeform addresses, prefilled from the customer record and
 * saved back on submit) then Review (final server-priced lines, terms, and the REQUIRED
 * research-use-only acknowledgment). Place order stays disabled until the box is checked;
 * the server action re-checks everything anyway - pricing, the 20-unit minimum, and the
 * acknowledgment - so this UI is a courtesy, not the gate.
 */

const STEPS = ["Shipping", "Review"] as const;
type Step = (typeof STEPS)[number];

function StepStrip({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Checkout steps">
      {STEPS.map((step, i) => {
        const isCurrent = step === current;
        const isDone = STEPS.indexOf(current) > i;
        return (
          <li key={step} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-8 bg-lap-border" aria-hidden="true" />}
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                isCurrent
                  ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
                  : isDone
                    ? "border-lap-green/40 bg-lap-green/10 text-lap-green"
                    : "border-lap-border bg-lap-surface text-lap-slate"
              }`}
            >
              {i + 1}. {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function CheckoutFlow({
  cart,
  initialShippingAddress,
  initialBillingAddress,
  paymentTerms,
  termsLine,
}: {
  cart: PricedClientCart;
  initialShippingAddress: string;
  initialBillingAddress: string;
  paymentTerms: string;
  termsLine: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("Shipping");
  const [shippingAddress, setShippingAddress] = useState(initialShippingAddress);
  const [billingAddress, setBillingAddress] = useState(initialBillingAddress);
  const [ruoAcknowledged, setRuoAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const shippingValid = shippingAddress.trim().length > 0;

  function placeOrder() {
    setError(null);
    startTransition(async () => {
      const result = await placeClientOrder({
        shippingAddress: shippingAddress.trim(),
        billingAddress: billingAddress.trim() || undefined,
        ruoAcknowledged,
      });
      if (result.ok && result.quoteId) {
        router.push(`/store/orders/${result.quoteId}`);
      } else {
        setError(result.message ?? "Could not place your order. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <StepStrip current={step} />

      {step === "Shipping" ? (
        <div className="rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap sm:p-6">
          <h2 className="font-heading text-lg font-semibold text-lap-ink">Shipping</h2>
          <p className="mt-1 text-sm text-lap-slate">
            Confirm where this order ships. Changes here update your account.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="checkout-shipping" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-lap-slate">
                Shipping address
              </label>
              <textarea
                id="checkout-shipping"
                rows={3}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Business name, street, city, state, ZIP"
                className="w-full rounded-[10px] border border-lap-border bg-lap-surface px-3 py-2 text-sm text-lap-ink placeholder:text-lap-slate/60 focus:border-lap-teal focus:outline-none focus:ring-2 focus:ring-lap-teal-bright/40"
              />
            </div>
            <div>
              <label htmlFor="checkout-billing" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-lap-slate">
                Billing address <span className="font-normal normal-case text-lap-slate/70">(leave blank if same as shipping)</span>
              </label>
              <textarea
                id="checkout-billing"
                rows={3}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Same as shipping"
                className="w-full rounded-[10px] border border-lap-border bg-lap-surface px-3 py-2 text-sm text-lap-ink placeholder:text-lap-slate/60 focus:border-lap-teal focus:outline-none focus:ring-2 focus:ring-lap-teal-bright/40"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Link href="/store/cart" className="text-sm font-semibold text-lap-teal hover:underline">
              Back to cart
            </Link>
            <button
              type="button"
              disabled={!shippingValid}
              onClick={() => setStep("Review")}
              className="btn-primary px-6 text-sm"
              data-testid="checkout-continue"
            >
              Continue to review
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap sm:p-6">
            <h2 className="font-heading text-lg font-semibold text-lap-ink">Review your order</h2>

            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-lap-border text-left text-[11px] uppercase tracking-wide text-lap-slate">
                  <th scope="col" className="py-2 pr-3 font-medium">Product</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Qty</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Unit</th>
                  <th scope="col" className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((line) => (
                  <tr key={line.itemId} className="border-b border-lap-border last:border-b-0">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-lap-ink">{line.productName}</span>{" "}
                      <span className="text-lap-slate">{line.size}</span>
                      <span className="block font-mono text-[11px] text-lap-slate">{line.sku}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-lap-ink">{line.quantity}</td>
                    <td className="py-2.5 pr-3 text-right font-mono text-lap-ink">
                      {line.unitPrice != null ? formatMoney(line.unitPrice) : "-"}
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-lap-ink">
                      {line.lineTotal != null ? formatMoney(line.lineTotal) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right text-sm font-semibold text-lap-ink">
                    Subtotal
                  </td>
                  <td className="pt-3 text-right font-mono text-lg font-semibold text-lap-ink" data-testid="checkout-subtotal">
                    {formatMoney(cart.subtotal)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p className="mt-2 text-xs text-lap-slate">
              {cart.totalUnits} units pooled for tier pricing · {cart.ladderName}. Final invoice
              totals (shipping, any fees) are confirmed by your account manager at review.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-lap-slate">Ships to</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-lap-ink" data-testid="checkout-review-shipping">
                {shippingAddress.trim()}
              </p>
            </div>
            <div className="rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-lap-slate">Billing</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-lap-ink">
                {billingAddress.trim() || "Same as shipping"}
              </p>
              <p className="mt-3 text-xs text-lap-slate" data-testid="checkout-terms-line">
                Payment terms: {paymentTerms} - {termsLine}
              </p>
            </div>
          </div>

          <div className="rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={ruoAcknowledged}
                onChange={(e) => setRuoAcknowledged(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-lap-border text-lap-teal focus:ring-2 focus:ring-lap-teal-bright/40"
                data-testid="checkout-ruo"
              />
              <span className="text-sm text-lap-ink">{CLIENT_RUO_ACKNOWLEDGMENT}</span>
            </label>

            {error && (
              <p role="alert" className="mt-3 text-sm text-lap-red" data-testid="checkout-error">
                {error}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("Shipping")}
                className="text-sm font-semibold text-lap-teal hover:underline"
              >
                Back to shipping
              </button>
              <button
                type="button"
                disabled={!ruoAcknowledged || isPending}
                onClick={placeOrder}
                className="btn-primary px-6 text-sm"
                data-testid="checkout-place-order"
              >
                {isPending ? "Placing order..." : "Place order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
