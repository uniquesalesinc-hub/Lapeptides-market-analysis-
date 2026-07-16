"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PriceListCode } from "@prisma/client";
import type { CatalogProduct } from "@/lib/data/catalog";
import { fetchCatalogForWizard } from "@/lib/actions/catalog-actions";
import { saveQuoteDraft, finalizeAndSendQuote } from "@/lib/actions/quote-actions";
import { calculateQuoteTotals } from "@/lib/pricing/engine";
import type { CartLine, CustomerOption, WizardAdjustment, WizardStep, QuoteLadderCode } from "./wizard-types";
import { StepTabs } from "./StepTabs";
import { CustomerStep } from "./steps/CustomerStep";
import { ProductsStep } from "./steps/ProductsStep";
import { ChargesStep } from "./steps/ChargesStep";
import { ReviewStep } from "./steps/ReviewStep";

export interface QuoteWizardInitialData {
  quoteId: string | null;
  quoteNumber: string | null;
  customerId: string | null;
  priceListCode: QuoteLadderCode;
  cart: CartLine[];
  adjustments: WizardAdjustment[];
  depositPercent: number | null;
  expirationDate: string | null;
  paymentTerms: string;
  customerFacingNotes: string;
  internalNotes: string;
}

export function QuoteWizard({
  customers,
  repDiscountLimitPercent,
  defaultExpirationDays,
  defaultTerms,
  isAdmin,
  initial,
}: {
  customers: CustomerOption[];
  repDiscountLimitPercent: number;
  defaultExpirationDays: number;
  defaultTerms: string;
  isAdmin: boolean;
  initial: QuoteWizardInitialData;
}) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(initial.customerId ? "products" : "customer");
  const [customerId, setCustomerId] = useState<string | null>(initial.customerId);
  const [priceListCode, setPriceListCode] = useState<QuoteLadderCode>(initial.priceListCode);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [cart, setCart] = useState<CartLine[]>(initial.cart);
  const [adjustments, setAdjustments] = useState<WizardAdjustment[]>(initial.adjustments);
  const [depositPercent, setDepositPercent] = useState<number | null>(initial.depositPercent ?? 100);
  const [expirationDate, setExpirationDate] = useState(
    initial.expirationDate ??
      new Date(Date.now() + defaultExpirationDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [paymentTerms, setPaymentTerms] = useState(initial.paymentTerms || "Prepaid");
  const [customerFacingNotes, setCustomerFacingNotes] = useState(initial.customerFacingNotes);
  const [internalNotes, setInternalNotes] = useState(initial.internalNotes);

  const [quoteId, setQuoteId] = useState<string | null>(initial.quoteId);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(initial.quoteNumber);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineWarnings, setLineWarnings] = useState<Array<{ sku: string; warning: string }>>([]);
  const [blockingApprovals, setBlockingApprovals] = useState<Array<{ label: string; reason: string }>>([]);

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  const loadCatalog = useCallback(async (code: PriceListCode) => {
    setCatalogLoading(true);
    try {
      const data = await fetchCatalogForWizard(code);
      setCatalog(data);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog(priceListCode);
  }, [priceListCode, loadCatalog]);

  function selectCustomer(customer: CustomerOption) {
    setCustomerId(customer.id);
    if (cart.length === 0)
      setPriceListCode(customer.defaultPriceListCode === "BULK_WHOLESALE" ? "BULK_WHOLESALE" : "BULK_RETAIL");
    setStep("products");
  }

  const validLineTotals = useMemo(
    () => cart.filter((l) => l.pricing.qualifies).map((l) => l.pricing.lineTotal!),
    [cart]
  );
  const totals = useMemo(
    () =>
      calculateQuoteTotals({
        lineTotals: validLineTotals,
        adjustments,
        depositPercent: depositPercent ?? undefined,
      }),
    [validLineTotals, adjustments, depositPercent]
  );

  async function persistDraft(): Promise<{ ok: boolean; quoteId?: string }> {
    if (!customerId || cart.length === 0) return { ok: false };
    setSaving(true);
    setError(null);
    try {
      const result = await saveQuoteDraft({
        quoteId,
        customerId,
        priceListCode,
        lineItems: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        adjustments: adjustments.map((a) => ({ kind: a.kind, label: a.label, valueType: a.valueType, value: a.value })),
        depositPercent,
        expirationDate,
        paymentTerms,
        customerFacingNotes,
        internalNotes,
      });
      if (!result.ok) {
        setError(result.message ?? "Could not save this quote.");
        setLineWarnings(result.lineWarnings ?? []);
        setBlockingApprovals(result.blockingApprovals ?? []);
        return { ok: false };
      }
      setQuoteId(result.quoteId ?? null);
      setQuoteNumber(result.quoteNumber ?? null);
      setLineWarnings(result.lineWarnings ?? []);
      setBlockingApprovals(result.blockingApprovals ?? []);
      return { ok: true, quoteId: result.quoteId };
    } finally {
      setSaving(false);
    }
  }

  function goToStep(next: WizardStep) {
    // Autosave whenever there's enough to save, so a rep never loses work mid-call.
    if (customerId && cart.length > 0) persistDraft();
    setStep(next);
  }

  async function handleSaveDraft() {
    const result = await persistDraft();
    if (result.ok) router.push(`/quotes/${result.quoteId}`);
  }

  async function handleSend() {
    const saved = await persistDraft();
    if (!saved.ok || !saved.quoteId) return;
    setSaving(true);
    try {
      const result = await finalizeAndSendQuote(saved.quoteId, selectedCustomer?.email ?? undefined);
      if (!result.ok) {
        setError(result.message ?? "Could not send this quote.");
        setLineWarnings(result.lineWarnings ?? []);
        setBlockingApprovals(result.blockingApprovals ?? []);
        return;
      }
      router.push(`/quotes/${saved.quoteId}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <StepTabs
        current={step}
        onChange={goToStep}
        canReview={!!customerId && cart.length > 0}
        canCharges={!!customerId && cart.length > 0}
      />

      {error && (
        <p className="rounded-lg border border-lap-red/40 bg-lap-red/10 px-3 py-2 text-sm text-lap-red">
          {error}
        </p>
      )}
      {blockingApprovals.length > 0 && (
        <div className="rounded-lg border border-lap-amber/40 bg-lap-amber/10 px-3 py-2 text-sm text-[#9A6318]">
          <p className="font-semibold">Requires administrator approval:</p>
          <ul className="list-inside list-disc">
            {blockingApprovals.map((b, i) => (
              <li key={i}>
                {b.label} - {b.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === "customer" && (
        <CustomerStep customers={customers} selectedCustomerId={customerId} onSelect={selectCustomer} />
      )}

      {step === "products" && (
        <ProductsStep
          catalog={catalog}
          loading={catalogLoading}
          priceListCode={priceListCode}
          onPriceListChange={setPriceListCode}
          cart={cart}
          setCart={setCart}
          lineWarnings={lineWarnings}
          onContinue={() => goToStep("charges")}
        />
      )}

      {step === "charges" && (
        <ChargesStep
          adjustments={adjustments}
          setAdjustments={setAdjustments}
          depositPercent={depositPercent}
          setDepositPercent={setDepositPercent}
          expirationDate={expirationDate}
          setExpirationDate={setExpirationDate}
          paymentTerms={paymentTerms}
          setPaymentTerms={setPaymentTerms}
          customerFacingNotes={customerFacingNotes}
          setCustomerFacingNotes={setCustomerFacingNotes}
          internalNotes={internalNotes}
          setInternalNotes={setInternalNotes}
          repDiscountLimitPercent={isAdmin ? 100 : repDiscountLimitPercent}
          subtotal={totals.subtotal}
          onContinue={() => goToStep("review")}
        />
      )}

      {step === "review" && selectedCustomer && (
        <ReviewStep
          customer={selectedCustomer}
          priceListCode={priceListCode}
          cart={cart}
          adjustments={adjustments}
          totals={totals}
          depositPercent={depositPercent}
          expirationDate={expirationDate}
          paymentTerms={paymentTerms}
          customerFacingNotes={customerFacingNotes}
          internalNotes={internalNotes}
          termsAndConditions={defaultTerms}
          quoteNumber={quoteNumber}
          saving={saving}
          onSaveDraft={handleSaveDraft}
          onSend={handleSend}
        />
      )}

      {step !== "review" && cart.length > 0 && (
        <div
          className="no-print fixed inset-x-0 z-30 border-t border-lap-border bg-lap-surface px-4 py-3"
          // The shell's MobileNav is also `fixed bottom-0` and adds `env(safe-area-inset-bottom)`
          // on top of its own ~52px content height - a hardcoded `bottom-16` (64px) sits *inside*
          // that nav's real footprint on notched phones (iPhone X and later), covering part of the
          // Continue/Review Quote button. Push this bar up by the same safe-area inset so it
          // always clears the nav regardless of device.
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <div>
              <p className="text-xs text-lap-slate">{cart.length} line item(s)</p>
              <p className="font-mono font-semibold text-lap-ink">{totals.subtotal.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
            </div>
            <button
              type="button"
              className="btn-primary !min-h-0 !px-5 !py-2.5"
              onClick={() => goToStep(step === "products" ? "charges" : "review")}
              disabled={saving}
            >
              {step === "products" ? "Continue" : "Review Quote"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
