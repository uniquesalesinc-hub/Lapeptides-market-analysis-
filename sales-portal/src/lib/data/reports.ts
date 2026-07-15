import { prisma } from "@/lib/prisma";

export async function getReportsData() {
  const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const [
    quotesByRepRaw,
    invoicesByRepRaw,
    conversionCounts,
    quotedValue,
    invoicedValue,
    outstandingInvoices,
    topCustomersRaw,
    topProductsByQuoteQty,
    topProductsByInvoiceQty,
    discountsByRepRaw,
    expiringQuotes,
    unpaidInvoices,
    users,
    customers,
  ] = await Promise.all([
    prisma.quote.groupBy({ by: ["ownerId"], _count: { _all: true }, _sum: { grandTotal: true } }),
    prisma.invoice.groupBy({ by: ["ownerId"], _count: { _all: true }, _sum: { grandTotal: true } }),
    prisma.quote.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.quote.aggregate({ where: { status: { notIn: ["DRAFT", "CANCELLED"] } }, _sum: { grandTotal: true } }),
    prisma.invoice.aggregate({ where: { status: { notIn: ["CANCELLED", "VOIDED"] } }, _sum: { grandTotal: true } }),
    prisma.invoice.findMany({ where: { status: { in: ["SENT", "PARTIALLY_PAID"] } }, select: { balanceDue: true, dueDate: true } }),
    prisma.quote.groupBy({ by: ["customerId"], _sum: { grandTotal: true }, orderBy: { _sum: { grandTotal: "desc" } }, take: 10 }),
    prisma.quoteLineItem.groupBy({ by: ["productName"], _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { quantity: "desc" } }, take: 10 }),
    prisma.invoiceLineItem.groupBy({ by: ["productName"], _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { quantity: "desc" } }, take: 10 }),
    prisma.adjustment.groupBy({
      by: ["quoteId"],
      where: { quoteId: { not: null }, type: { in: ["CUSTOMER_DISCOUNT", "REP_DISCOUNT"] } },
      _sum: { amount: true },
    }),
    prisma.quote.findMany({
      where: { status: { in: ["SENT", "VIEWED", "AWAITING_APPROVAL"] }, expirationDate: { lte: in14Days, gte: new Date() } },
      include: { customer: { select: { businessName: true } }, owner: { select: { name: true } } },
      orderBy: { expirationDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID"] } },
      include: { customer: { select: { businessName: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.customer.findMany({ select: { id: true, businessName: true } }),
  ]);

  const userNameById = new Map(users.map((u) => [u.id, u.name]));
  const customerNameById = new Map(customers.map((c) => [c.id, c.businessName]));

  // Discounts by rep requires joining adjustments -> quote -> ownerId, since Adjustment has no
  // direct owner column.
  const quoteOwnerByQuoteId = new Map(
    (await prisma.quote.findMany({ select: { id: true, ownerId: true } })).map((q) => [q.id, q.ownerId])
  );
  const discountsByRep = new Map<string, number>();
  for (const row of discountsByRepRaw) {
    const ownerId = quoteOwnerByQuoteId.get(row.quoteId!);
    if (!ownerId) continue;
    discountsByRep.set(ownerId, (discountsByRep.get(ownerId) ?? 0) + Math.abs(Number(row._sum.amount ?? 0)));
  }

  const sentOrBeyond = conversionCounts.filter((c) => c.status !== "DRAFT").reduce((s, c) => s + c._count._all, 0);
  const converted = conversionCounts.find((c) => c.status === "CONVERTED_TO_INVOICE")?._count._all ?? 0;

  return {
    quotesByRep: quotesByRepRaw.map((r) => ({
      repName: userNameById.get(r.ownerId) ?? "Unknown",
      count: r._count._all,
      total: Number(r._sum.grandTotal ?? 0),
    })),
    invoicesByRep: invoicesByRepRaw.map((r) => ({
      repName: userNameById.get(r.ownerId) ?? "Unknown",
      count: r._count._all,
      total: Number(r._sum.grandTotal ?? 0),
    })),
    conversionRate: sentOrBeyond > 0 ? (converted / sentOrBeyond) * 100 : 0,
    totalQuotedValue: Number(quotedValue._sum.grandTotal ?? 0),
    totalInvoicedValue: Number(invoicedValue._sum.grandTotal ?? 0),
    outstandingTotal: outstandingInvoices.reduce((s, i) => s + Number(i.balanceDue), 0),
    outstandingOverdueTotal: outstandingInvoices
      .filter((i) => i.dueDate && i.dueDate < new Date())
      .reduce((s, i) => s + Number(i.balanceDue), 0),
    topCustomers: topCustomersRaw.map((c) => ({
      customerName: customerNameById.get(c.customerId) ?? "Unknown",
      total: Number(c._sum.grandTotal ?? 0),
    })),
    topProductsByQuoteQty: topProductsByQuoteQty.map((p) => ({ productName: p.productName, quantity: p._sum.quantity ?? 0, value: Number(p._sum.lineTotal ?? 0) })),
    topProductsByInvoiceQty: topProductsByInvoiceQty.map((p) => ({ productName: p.productName, quantity: p._sum.quantity ?? 0, value: Number(p._sum.lineTotal ?? 0) })),
    discountsByRep: [...discountsByRep.entries()].map(([ownerId, total]) => ({ repName: userNameById.get(ownerId) ?? "Unknown", total })),
    expiringQuotes,
    unpaidInvoices,
  };
}

export type ReportsData = Awaited<ReturnType<typeof getReportsData>>;
