import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getQuoteById } from "@/lib/data/quotes";
import { listCustomers } from "@/lib/data/customers";
import { previewLinePricing } from "@/lib/pricing/clientPreview";
import { getCatalog } from "@/lib/data/catalog";
import { QuoteWizard, type QuoteWizardInitialData } from "@/components/quotes/QuoteWizard";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();
  if (user.role === "SALES_REP" && quote.ownerId !== user.id) redirect("/quotes");
  if (quote.status !== "DRAFT") redirect(`/quotes/${id}`);

  const [customers, settings, currentUser, catalog] = await Promise.all([
    listCustomers(user),
    prisma.companySettings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
    prisma.user.findUnique({ where: { id: user.id } }),
    getCatalog(quote.priceListCode),
  ]);

  const customerOptions = customers.map((c) => ({
    id: c.id,
    businessName: c.businessName,
    contactName: c.contactName,
    email: c.email,
    defaultPriceListCode: c.defaultPriceListCode as never,
  }));

  const cart = quote.lineItems
    .filter((li) => li.productVariantId)
    .map((li) => {
      const variant = catalog.flatMap((p) => p.variants).find((v) => v.id === li.productVariantId);
      const pricing = variant
        ? previewLinePricing(variant, li.quantity)
        : {
            qualifies: li.minimumMet,
            appliedTier: null,
            unitPrice: Number(li.unitPrice),
            lineTotal: Number(li.lineTotal),
            minimumRequired: li.minimumRequired ?? 0,
            shortfall: null,
            nextEligibleTier: null,
            warning: null,
          };
      return {
        variantId: li.productVariantId as string,
        sku: li.sku,
        productName: li.productName,
        strength: li.strength,
        quantity: li.quantity,
        pricing,
      };
    });

  const depositPercent =
    quote.grandTotal && Number(quote.grandTotal) > 0
      ? Math.round((Number(quote.depositRequired) / Number(quote.grandTotal)) * 100)
      : 100;

  const initial: QuoteWizardInitialData = {
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    customerId: quote.customerId,
    priceListCode: quote.priceListCode === "BULK_WHOLESALE" ? "BULK_WHOLESALE" : "BULK_RETAIL",
    cart,
    adjustments: quote.adjustments.map((a) => ({
      id: a.id,
      kind: a.type,
      label: a.label,
      valueType: a.valueType,
      value: Number(a.value),
    })),
    depositPercent,
    expirationDate: quote.expirationDate ? quote.expirationDate.toISOString().slice(0, 10) : null,
    paymentTerms: quote.paymentTerms ?? "Prepaid",
    customerFacingNotes: quote.customerFacingNotes ?? "",
    internalNotes: quote.internalNotes ?? "",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Edit {quote.quoteNumber}</h1>
      <QuoteWizard
        customers={customerOptions}
        repDiscountLimitPercent={Number(currentUser?.discountLimitPercent ?? settings.repDiscountLimitPercent)}
        defaultExpirationDays={settings.defaultQuoteExpirationDays}
        defaultTerms={settings.defaultTermsAndConditions ?? ""}
        isAdmin={user.role === "ADMIN"}
        initial={initial}
      />
    </div>
  );
}
