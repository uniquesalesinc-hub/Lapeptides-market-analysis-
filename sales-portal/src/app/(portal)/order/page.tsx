import { getEffectiveViewer } from "@/lib/viewAs";
import { prisma } from "@/lib/prisma";
import { getOrderRails, getPreviouslyPurchased, getWizardCatalog } from "@/lib/data/catalog";
import { listOrderModeCustomers } from "@/lib/data/customers";
import { OrderModeProvider } from "@/components/order/OrderModeProvider";
import { OrderModeScreen } from "@/components/order/OrderModeScreen";
import type { CatalogsByLadder, OrderCustomer } from "@/components/order/orderMode";

export const metadata = { title: "Order Mode | LA Peptides Sales Portal" };

/**
 * Order Mode: the rep's primary selling surface. Loads both injectable ladders up front so
 * switching customer/ladder never waits on the network, plus the rep-scoped customer list
 * and the demand rails. `?customerId=` preselects a customer (e.g. arriving from Customer 360).
 */
export default async function OrderModePage({
  searchParams,
}: {
  searchParams?: { customerId?: string; selectCustomer?: string };
}) {
  const user = await getEffectiveViewer();

  const [retail, wholesale, customerRows, rails, settings, currentUser] = await Promise.all([
    getWizardCatalog("BULK_RETAIL"),
    getWizardCatalog("BULK_WHOLESALE"),
    listOrderModeCustomers({ id: user.id, role: user.role }),
    getOrderRails(),
    prisma.companySettings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
    prisma.user.findUnique({ where: { id: user.id } }),
  ]);

  const catalogs: CatalogsByLadder = { BULK_RETAIL: retail, BULK_WHOLESALE: wholesale };

  const customers: OrderCustomer[] = customerRows.map((c) => ({
    id: c.id,
    businessName: c.businessName,
    city: c.billingCity,
    orderCount: c._count.invoices,
    // The DB column is TEXT; anything that is not the wholesale ladder quotes as retail.
    defaultPriceListCode: c.defaultPriceListCode === "BULK_WHOLESALE" ? "BULK_WHOLESALE" : "BULK_RETAIL",
    paymentTerms: c.paymentTerms,
  }));

  // Same limit resolution as the legacy wizard (quotes/new): the rep's personal ceiling,
  // falling back to the company default; admins are uncapped. Display-side only - the
  // createQuote path re-derives this server-side on every save.
  const discountLimitPercent =
    user.role === "ADMIN" ? 100 : Number(currentUser?.discountLimitPercent ?? settings.repDiscountLimitPercent);

  const requestedId = searchParams?.customerId;
  const initialCustomerId = customers.some((c) => c.id === requestedId) ? requestedId : undefined;
  const initialHistory = initialCustomerId ? await getPreviouslyPurchased(initialCustomerId) : undefined;

  return (
    <OrderModeProvider
      catalogs={catalogs}
      customers={customers}
      currentUserId={user.id}
      discountLimitPercent={discountLimitPercent}
      defaultExpirationDays={settings.defaultQuoteExpirationDays}
      initialCustomerId={initialCustomerId}
      initialHistory={initialHistory}
    >
      <OrderModeScreen rails={rails} initialCustomerDrawerOpen={searchParams?.selectCustomer === "1"} />
    </OrderModeProvider>
  );
}
