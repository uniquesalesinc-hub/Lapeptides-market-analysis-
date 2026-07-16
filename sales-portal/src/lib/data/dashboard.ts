import { prisma } from "@/lib/prisma";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getRepDashboard(userId: string) {
  const monthStart = startOfMonth();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const today = new Date();

  const [
    quotesThisMonth,
    openQuotes,
    awaitingApproval,
    expiringQuotes,
    invoicesThisMonth,
    unpaidInvoices,
    recentCustomers,
    recentActivity,
    followUpsDue,
  ] = await Promise.all([
    prisma.quote.count({ where: { ownerId: userId, createdAt: { gte: monthStart } } }),
    prisma.quote.count({ where: { ownerId: userId, status: { in: ["DRAFT", "SENT", "VIEWED"] } } }),
    prisma.quote.count({ where: { ownerId: userId, status: { in: ["SENT", "VIEWED", "AWAITING_APPROVAL"] } } }),
    prisma.quote.findMany({
      where: {
        ownerId: userId,
        status: { in: ["SENT", "VIEWED", "AWAITING_APPROVAL"] },
        expirationDate: { gte: today, lte: in7Days },
      },
      include: { customer: { select: { businessName: true } } },
      orderBy: { expirationDate: "asc" },
      take: 5,
    }),
    prisma.invoice.count({ where: { ownerId: userId, createdAt: { gte: monthStart } } }),
    prisma.invoice.findMany({
      where: { ownerId: userId, status: { in: ["SENT", "PARTIALLY_PAID"] } },
      include: { customer: { select: { businessName: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.customer.findMany({ where: { assignedRepId: userId }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.activityLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { customer: { select: { businessName: true } }, quote: { select: { quoteNumber: true } }, invoice: { select: { invoiceNumber: true } } },
    }),
    prisma.customer.findMany({
      where: { assignedRepId: userId, followUpDate: { lte: today } },
      orderBy: { followUpDate: "asc" },
      take: 10,
    }),
  ]);

  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);

  return {
    quotesThisMonth,
    openQuotes,
    awaitingApproval,
    expiringQuotes,
    invoicesThisMonth,
    unpaidInvoices,
    unpaidTotal,
    recentCustomers,
    recentActivity,
    followUpsDue,
  };
}

export async function getAdminDashboard() {
  const monthStart = startOfMonth();

  const [
    quotedRevenue,
    invoicedRevenue,
    salesByRep,
    quoteConversionCounts,
    outstandingInvoices,
    recentAccounts,
    topProducts,
  ] = await Promise.all([
    prisma.quote.aggregate({
      where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
      _sum: { grandTotal: true },
    }),
    prisma.invoice.aggregate({
      where: { status: { notIn: ["CANCELLED", "VOIDED"] } },
      _sum: { grandTotal: true },
    }),
    prisma.quote.groupBy({
      by: ["ownerId"],
      where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
      _sum: { grandTotal: true },
      _count: { _all: true },
    }),
    prisma.quote.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID"] } },
      select: { balanceDue: true },
    }),
    prisma.customer.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { assignedRep: { select: { name: true } } } }),
    prisma.quoteLineItem.groupBy({
      by: ["productName"],
      _sum: { lineTotal: true, quantity: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 8,
    }),
  ]);

  const repIds = salesByRep.map((r) => r.ownerId);
  const reps = await prisma.user.findMany({ where: { id: { in: repIds } }, select: { id: true, name: true } });
  const repNameById = new Map(reps.map((r) => [r.id, r.name]));

  const sentOrBeyond = quoteConversionCounts
    .filter((q) => q.status !== "DRAFT")
    .reduce((sum, q) => sum + q._count._all, 0);
  const converted = quoteConversionCounts.find((q) => q.status === "CONVERTED_TO_INVOICE")?._count._all ?? 0;
  const conversionRate = sentOrBeyond > 0 ? (converted / sentOrBeyond) * 100 : 0;

  const outstandingTotal = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);

  return {
    quotedRevenue: Number(quotedRevenue._sum.grandTotal ?? 0),
    invoicedRevenue: Number(invoicedRevenue._sum.grandTotal ?? 0),
    salesByRep: salesByRep
      .map((r) => ({ repId: r.ownerId, repName: repNameById.get(r.ownerId) ?? "Unknown", total: Number(r._sum.grandTotal ?? 0), count: r._count._all }))
      .sort((a, b) => b.total - a.total),
    conversionRate,
    outstandingTotal,
    outstandingCount: outstandingInvoices.length,
    recentAccounts,
    topProducts: topProducts.map((p) => ({ productName: p.productName, total: Number(p._sum.lineTotal ?? 0), quantity: p._sum.quantity ?? 0 })),
    monthStart,
  };
}
