import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listCustomers } from "@/lib/data/customers";
import { QuoteWizard, type QuoteWizardInitialData } from "@/components/quotes/QuoteWizard";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const [customers, settings, currentUser] = await Promise.all([
    listCustomers(user),
    prisma.companySettings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
    prisma.user.findUnique({ where: { id: user.id } }),
  ]);

  const customerOptions = customers.map((c) => ({
    id: c.id,
    businessName: c.businessName,
    contactName: c.contactName,
    email: c.email,
    defaultPriceListCode: c.defaultPriceListCode as never,
  }));

  const preselected = sp.customerId ? customerOptions.find((c) => c.id === sp.customerId) : undefined;

  const initial: QuoteWizardInitialData = {
    quoteId: null,
    quoteNumber: null,
    customerId: preselected?.id ?? null,
    priceListCode: preselected?.defaultPriceListCode ?? "BULK_RETAIL",
    cart: [],
    adjustments: [],
    depositPercent: 100,
    expirationDate: null,
    paymentTerms: settings.defaultPaymentTerms,
    customerFacingNotes: settings.defaultQuoteNotes ?? "",
    internalNotes: "",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">New Quote</h1>
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
