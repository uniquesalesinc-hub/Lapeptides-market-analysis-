import { prisma } from "@/lib/prisma";
import type { Prisma, QuoteStatus } from "@prisma/client";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ---------------------------------------------------------------------------
// CRM dashboard aggregates (Home + Sales tabs)
// ---------------------------------------------------------------------------

/** Same "order" definition as getCustomer360: quotes accepted on the spot or already invoiced. */
const ORDER_QUOTE_STATUSES: QuoteStatus[] = ["APPROVED", "CONVERTED_TO_INVOICE"];

export interface DashboardViewer {
  id: string;
  role: "ADMIN" | "SALES_REP";
}

function ownerScope(viewer: DashboardViewer): Prisma.QuoteWhereInput {
  return viewer.role === "SALES_REP" ? { ownerId: viewer.id } : {};
}

/** [start, end) windows for the current and previous calendar month. */
export function monthWindows(now = new Date()) {
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { thisMonth: { start: thisStart, end: nextStart }, lastMonth: { start: lastStart, end: thisStart } };
}

export interface MonthSales {
  revenue: number;
  orders: number;
  drafts: number;
}

async function monthSales(
  scope: Prisma.QuoteWhereInput,
  window: { start: Date; end: Date }
): Promise<MonthSales> {
  const range = { gte: window.start, lt: window.end };
  const [orderAgg, drafts] = await Promise.all([
    prisma.quote.aggregate({
      where: { ...scope, status: { in: ORDER_QUOTE_STATUSES }, quoteDate: range },
      _sum: { grandTotal: true },
      _count: { _all: true },
    }),
    prisma.quote.count({ where: { ...scope, status: "DRAFT", quoteDate: range } }),
  ]);
  return {
    revenue: Number(orderAgg._sum.grandTotal ?? 0),
    orders: orderAgg._count._all,
    drafts,
  };
}

export interface SalesComparison {
  thisMonth: MonthSales;
  lastMonth: MonthSales;
}

/** Booked revenue / confirmed orders / drafts, this calendar month vs last. Rep-own or admin-all. */
export async function getSalesComparison(viewer: DashboardViewer): Promise<SalesComparison> {
  const scope = ownerScope(viewer);
  const windows = monthWindows();
  const [thisMonth, lastMonth] = await Promise.all([
    monthSales(scope, windows.thisMonth),
    monthSales(scope, windows.lastMonth),
  ]);
  return { thisMonth, lastMonth };
}

export interface RepSalesRow {
  repId: string;
  repName: string;
  revenue: number;
  orders: number;
  drafts: number;
}

/** Admin-only per-rep breakdown for the current calendar month. */
export async function getRepSalesBreakdown(): Promise<RepSalesRow[]> {
  const { thisMonth } = monthWindows();
  const range = { gte: thisMonth.start, lt: thisMonth.end };

  const [orderGroups, draftGroups, users] = await Promise.all([
    prisma.quote.groupBy({
      by: ["ownerId"],
      where: { status: { in: ORDER_QUOTE_STATUSES }, quoteDate: range },
      _sum: { grandTotal: true },
      _count: { _all: true },
    }),
    prisma.quote.groupBy({
      by: ["ownerId"],
      where: { status: "DRAFT", quoteDate: range },
      _count: { _all: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const rows = new Map<string, RepSalesRow>();
  const rowFor = (ownerId: string): RepSalesRow => {
    let row = rows.get(ownerId);
    if (!row) {
      row = { repId: ownerId, repName: nameById.get(ownerId) ?? "Unknown", revenue: 0, orders: 0, drafts: 0 };
      rows.set(ownerId, row);
    }
    return row;
  };

  for (const g of orderGroups) {
    const row = rowFor(g.ownerId);
    row.revenue = Number(g._sum.grandTotal ?? 0);
    row.orders = g._count._all;
  }
  for (const g of draftGroups) rowFor(g.ownerId).drafts = g._count._all;

  return [...rows.values()].sort((a, b) => b.revenue - a.revenue);
}

export interface DashboardHomeSummary {
  revenueThisMonth: number;
  revenueLastMonth: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  awaitingApproval: number;
  drafts: number;
}

export interface RecentQuoteRow {
  id: string;
  quoteNumber: string;
  quoteDate: Date;
  status: string;
  grandTotal: number;
  customerName: string;
}

/** Home tab: month summary plus the latest orders and quotes, scoped rep-own / admin-all. */
export async function getDashboardHome(viewer: DashboardViewer): Promise<{
  summary: DashboardHomeSummary;
  recentOrders: RecentQuoteRow[];
  recentQuotes: RecentQuoteRow[];
}> {
  const scope = ownerScope(viewer);
  const windows = monthWindows();

  const quoteSelect = {
    id: true,
    quoteNumber: true,
    quoteDate: true,
    status: true,
    grandTotal: true,
    customer: { select: { businessName: true } },
  } as const;

  const [thisMonth, lastMonth, awaitingApproval, drafts, orderRows, quoteRows] = await Promise.all([
    monthSales(scope, windows.thisMonth),
    monthSales(scope, windows.lastMonth),
    prisma.quote.count({ where: { ...scope, status: "AWAITING_APPROVAL" } }),
    prisma.quote.count({ where: { ...scope, status: "DRAFT" } }),
    prisma.quote.findMany({
      where: { ...scope, status: { in: ORDER_QUOTE_STATUSES } },
      orderBy: { quoteDate: "desc" },
      take: 6,
      select: quoteSelect,
    }),
    prisma.quote.findMany({
      where: scope,
      orderBy: { quoteDate: "desc" },
      take: 6,
      select: quoteSelect,
    }),
  ]);

  const toRow = (q: (typeof orderRows)[number]): RecentQuoteRow => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    quoteDate: q.quoteDate,
    status: q.status,
    grandTotal: Number(q.grandTotal),
    customerName: q.customer.businessName,
  });

  return {
    summary: {
      revenueThisMonth: thisMonth.revenue,
      revenueLastMonth: lastMonth.revenue,
      ordersThisMonth: thisMonth.orders,
      ordersLastMonth: lastMonth.orders,
      awaitingApproval,
      drafts,
    },
    recentOrders: orderRows.map(toRow),
    recentQuotes: quoteRows.map(toRow),
  };
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
