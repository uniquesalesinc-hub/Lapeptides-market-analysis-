import { notFound } from "next/navigation";
import { getEffectiveViewer } from "@/lib/viewAs";
import { prisma } from "@/lib/prisma";
import { getProductDetail, getWizardCatalog } from "@/lib/data/catalog";
import { listOrderModeCustomers } from "@/lib/data/customers";
import { OrderModeProvider } from "@/components/order/OrderModeProvider";
import { ProductDetail } from "@/components/catalog/ProductDetail";
import type { CatalogsByLadder, OrderCustomer } from "@/components/order/orderMode";

export const metadata = { title: "Product | LA Peptides Sales Portal" };

/**
 * Product detail page. Mounts its OWN OrderModeProvider instance: the provider persists
 * customer/ladder/cart to sessionStorage under one shared key, so the Order Mode session
 * (selected customer, pooled cart) carries over here and back without moving the provider
 * up the layout tree - /order stays untouched.
 */
export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const user = await getEffectiveViewer();

  const detail = await getProductDetail(params.id);
  if (!detail) notFound();

  const [retail, wholesale, customerRows, settings, currentUser] = await Promise.all([
    getWizardCatalog("BULK_RETAIL"),
    getWizardCatalog("BULK_WHOLESALE"),
    listOrderModeCustomers({ id: user.id, role: user.role }),
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

  const discountLimitPercent =
    user.role === "ADMIN" ? 100 : Number(currentUser?.discountLimitPercent ?? settings.repDiscountLimitPercent);

  return (
    <OrderModeProvider
      catalogs={catalogs}
      customers={customers}
      currentUserId={user.id}
      discountLimitPercent={discountLimitPercent}
      defaultExpirationDays={settings.defaultQuoteExpirationDays}
    >
      <ProductDetail detail={detail} />
    </OrderModeProvider>
  );
}
