import { prisma } from "@/lib/prisma";
import type { Prisma, QuoteStatus } from "@prisma/client";
import { displayInvoiceStatus } from "./invoiceStatus";
import { median } from "./reorderRadar";

// ---------------------------------------------------------------------------
// Filterable report aggregates (admin Reports tabs: Sales / Customers / Products / Team)
// ---------------------------------------------------------------------------

/** Same "confirmed order" definition as getCustomer360 / dashboard: accepted or invoiced. */
const ORDER_QUOTE_STATUSES: QuoteStatus[] = ["APPROVED", "CONVERTED_TO_INVOICE"];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Month labels/keys pinned to the business timezone, same as src/lib/format.ts. */
const BUSINESS_TZ = "America/Phoenix";

export type ReportPriceListCode = "BULK_RETAIL" | "BULK_WHOLESALE";

export interface ReportFilters {
  from?: Date;
  to?: Date; // inclusive calendar day
  customerId?: string;
  repId?: string;
  priceListCode?: ReportPriceListCode;
}

export type ProductSort = "qty" | "revenue" | "customers";

/**
 * Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD&customerId=&repId=&priceList= into typed filters.
 * Malformed values are dropped rather than thrown: a bad URL just means an unfiltered report.
 */
export function parseReportFilters(sp: {
  from?: string;
  to?: string;
  customerId?: string;
  repId?: string;
  priceList?: string;
}): ReportFilters {
  const filters: ReportFilters = {};
  const from = parseDay(sp.from);
  const to = parseDay(sp.to);
  if (from) filters.from = from;
  if (to) filters.to = to;
  if (sp.customerId) filters.customerId = sp.customerId;
  if (sp.repId) filters.repId = sp.repId;
  if (sp.priceList === "BULK_RETAIL" || sp.priceList === "BULK_WHOLESALE") {
    filters.priceListCode = sp.priceList;
  }
  return filters;
}

export function parseProductSort(value: string | undefined): ProductSort {
  return value === "revenue" || value === "customers" ? value : "qty";
}

function parseDay(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Quote-level where clause shared by every report; date range is [from, to+1day). */
function quoteWhere(filters: ReportFilters): Prisma.QuoteWhereInput {
  const where: Prisma.QuoteWhereInput = {};
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.repId) where.ownerId = filters.repId;
  if (filters.priceListCode) where.priceListCode = filters.priceListCode;
  if (filters.from || filters.to) {
    where.quoteDate = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lt: new Date(filters.to.getTime() + DAY_MS) } : {}),
    };
  }
  return where;
}

/** Rep + customer option lists for the report filter row (admin-only surface). */
export async function reportFilterOptions() {
  const [reps, customers] = await Promise.all([
    prisma.user.findMany({ where: { role: "SALES_REP" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.customer.findMany({ orderBy: { businessName: "asc" }, select: { id: true, businessName: true } }),
  ]);
  return {
    reps,
    customers: customers.map((c) => ({ id: c.id, name: c.businessName })),
  };
}

// Filter dates are constructed from URL day parts in server-local time (parseDay), so the
// label formats them the same way; running them through the Phoenix-pinned formatDate would
// shift the shown day when the server runs in UTC.
function formatFilterDay(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * States the active filter window in words so every big number sits next to its context,
 * e.g. "Jun 16 - Jul 16, 2026, Danny R., Bulk Retail (5-99 bottles)". No filters = "all time".
 */
export function describeReportFilters(
  filters: ReportFilters,
  options: { repName?: string; customerName?: string; priceListLabel?: string } = {}
): string {
  const parts: string[] = [];
  if (filters.from && filters.to) parts.push(`${formatFilterDay(filters.from)} - ${formatFilterDay(filters.to)}`);
  else if (filters.from) parts.push(`since ${formatFilterDay(filters.from)}`);
  else if (filters.to) parts.push(`through ${formatFilterDay(filters.to)}`);
  else parts.push("all time");
  if (options.repName) parts.push(options.repName);
  if (options.customerName) parts.push(options.customerName);
  if (options.priceListLabel) parts.push(options.priceListLabel);
  return parts.join(", ");
}

export interface MonthlySummaryRow {
  month: string; // e.g. "Jul 2026"
  totalQuotes: number;
  confirmedCount: number;
  confirmedAmount: number;
  draftCount: number;
}

/** Pure monthly grouping so it is unit-testable without a database. Newest month first. */
export function groupQuotesByMonth(
  quotes: Array<{ quoteDate: Date; status: string; grandTotal: number }>
): MonthlySummaryRow[] {
  const monthFmt = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, year: "numeric", month: "short" });
  const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit" });
  const byKey = new Map<string, MonthlySummaryRow>();

  for (const q of quotes) {
    const key = keyFmt.format(q.quoteDate); // "2026-07", sortable
    let row = byKey.get(key);
    if (!row) {
      row = { month: monthFmt.format(q.quoteDate), totalQuotes: 0, confirmedCount: 0, confirmedAmount: 0, draftCount: 0 };
      byKey.set(key, row);
    }
    row.totalQuotes += 1;
    if (q.status === "APPROVED" || q.status === "CONVERTED_TO_INVOICE") {
      row.confirmedCount += 1;
      row.confirmedAmount += q.grandTotal;
    }
    if (q.status === "DRAFT") row.draftCount += 1;
  }

  return [...byKey.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([, row]) => row);
}

export interface SalesReport {
  confirmedAmount: number;
  confirmedCount: number;
  averageOrderValue: number;
  /** confirmed orders / all non-draft quotes, 0-100. */
  quoteConversion: number;
  nonDraftCount: number;
  monthly: MonthlySummaryRow[];
}

export async function salesReport(filters: ReportFilters): Promise<SalesReport> {
  const where = quoteWhere(filters);
  const quotes = await prisma.quote.findMany({
    where,
    select: { quoteDate: true, status: true, grandTotal: true },
  });

  const confirmed = quotes.filter((q) => ORDER_QUOTE_STATUSES.includes(q.status));
  const confirmedAmount = confirmed.reduce((s, q) => s + Number(q.grandTotal), 0);
  const confirmedCount = confirmed.length;
  const nonDraftCount = quotes.filter((q) => q.status !== "DRAFT").length;

  return {
    confirmedAmount,
    confirmedCount,
    averageOrderValue: confirmedCount > 0 ? confirmedAmount / confirmedCount : 0,
    quoteConversion: nonDraftCount > 0 ? (confirmedCount / nonDraftCount) * 100 : 0,
    nonDraftCount,
    monthly: groupQuotesByMonth(
      quotes.map((q) => ({ quoteDate: q.quoteDate, status: q.status, grandTotal: Number(q.grandTotal) }))
    ),
  };
}

export interface CustomerLeaderboardRow {
  customerId: string;
  customerName: string;
  orderCount: number;
  orderAmount: number;
  lastOrderAt: Date;
  /** Median gap in days between consecutive orders; null when fewer than 3 orders. */
  avgReorderDays: number | null;
}

export async function customerLeaderboard(filters: ReportFilters): Promise<CustomerLeaderboardRow[]> {
  const orders = await prisma.quote.findMany({
    where: { ...quoteWhere(filters), status: { in: ORDER_QUOTE_STATUSES } },
    select: { customerId: true, quoteDate: true, grandTotal: true, customer: { select: { businessName: true } } },
    orderBy: { quoteDate: "asc" },
  });

  const byCustomer = new Map<string, { name: string; dates: Date[]; amount: number }>();
  for (const o of orders) {
    let entry = byCustomer.get(o.customerId);
    if (!entry) {
      entry = { name: o.customer.businessName, dates: [], amount: 0 };
      byCustomer.set(o.customerId, entry);
    }
    entry.dates.push(o.quoteDate);
    entry.amount += Number(o.grandTotal);
  }

  return [...byCustomer.entries()]
    .map(([customerId, e]): CustomerLeaderboardRow => {
      // dates are already ascending from orderBy; gaps use the same median math as Reorder Radar.
      const gaps: number[] = [];
      for (let i = 1; i < e.dates.length; i++) {
        gaps.push(Math.round((e.dates[i]!.getTime() - e.dates[i - 1]!.getTime()) / DAY_MS));
      }
      gaps.sort((a, b) => a - b);
      return {
        customerId,
        customerName: e.name,
        orderCount: e.dates.length,
        orderAmount: e.amount,
        lastOrderAt: e.dates[e.dates.length - 1]!,
        avgReorderDays: e.dates.length >= 3 ? median(gaps) : null,
      };
    })
    .sort((a, b) => b.orderAmount - a.orderAmount)
    .slice(0, 25);
}

export interface ProductLeaderboardRow {
  key: string;
  product: string;
  size: string;
  qtySold: number;
  revenue: number;
  distinctCustomers: number;
}

export async function productLeaderboard(
  filters: ReportFilters,
  sort: ProductSort
): Promise<ProductLeaderboardRow[]> {
  const lines = await prisma.quoteLineItem.findMany({
    where: { quote: { ...quoteWhere(filters), status: { in: ORDER_QUOTE_STATUSES } } },
    select: {
      productVariantId: true,
      sku: true,
      productName: true,
      strength: true,
      quantity: true,
      lineTotal: true,
      quote: { select: { customerId: true } },
    },
  });

  const byVariant = new Map<string, ProductLeaderboardRow & { customers: Set<string> }>();
  for (const line of lines) {
    const key = line.productVariantId ?? line.sku;
    let row = byVariant.get(key);
    if (!row) {
      row = { key, product: line.productName, size: line.strength, qtySold: 0, revenue: 0, distinctCustomers: 0, customers: new Set() };
      byVariant.set(key, row);
    }
    row.qtySold += line.quantity;
    row.revenue += Number(line.lineTotal);
    row.customers.add(line.quote.customerId);
  }

  const sortValue = (r: { qtySold: number; revenue: number; customers: Set<string> }) =>
    sort === "revenue" ? r.revenue : sort === "customers" ? r.customers.size : r.qtySold;

  return [...byVariant.values()]
    .sort((a, b) => sortValue(b) - sortValue(a))
    .slice(0, 25)
    .map(({ customers, ...row }) => ({ ...row, distinctCustomers: customers.size }));
}

export interface TeamLeaderboardRow {
  repId: string;
  repName: string;
  confirmedCount: number;
  revenue: number;
  /** confirmed / non-draft for this rep, 0-100; null when the rep has no non-draft quotes. */
  quoteConversion: number | null;
  discountRequests: number;
  discountApprovals: number;
}

export async function teamLeaderboard(filters: ReportFilters): Promise<TeamLeaderboardRow[]> {
  const where = quoteWhere(filters);
  const [confirmedGroups, nonDraftGroups, discountAdjustments, users] = await Promise.all([
    prisma.quote.groupBy({
      by: ["ownerId"],
      where: { ...where, status: { in: ORDER_QUOTE_STATUSES } },
      _sum: { grandTotal: true },
      _count: { _all: true },
    }),
    prisma.quote.groupBy({
      by: ["ownerId"],
      where: { ...where, status: { not: "DRAFT" } },
      _count: { _all: true },
    }),
    // Discount requests = over-limit discount adjustments the approval flow flagged
    // (quote-actions sets requiresApproval when the rep's authority check fails);
    // approvals = the subset an admin has since signed off (approvedById set).
    prisma.adjustment.findMany({
      where: {
        requiresApproval: true,
        type: { in: ["CUSTOMER_DISCOUNT", "REP_DISCOUNT"] },
        quote: { is: where },
      },
      select: { approvedById: true, quote: { select: { ownerId: true } } },
    }),
    prisma.user.findMany({ select: { id: true, name: true, role: true } }),
  ]);

  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const rows = new Map<string, TeamLeaderboardRow>();
  const rowFor = (repId: string): TeamLeaderboardRow => {
    let row = rows.get(repId);
    if (!row) {
      row = {
        repId,
        repName: nameById.get(repId) ?? "Unknown",
        confirmedCount: 0,
        revenue: 0,
        quoteConversion: null,
        discountRequests: 0,
        discountApprovals: 0,
      };
      rows.set(repId, row);
    }
    return row;
  };

  // Seed every sales rep so a rep with zero activity in the window still shows a row.
  for (const u of users) {
    if (u.role === "SALES_REP" && (!filters.repId || filters.repId === u.id)) rowFor(u.id);
  }
  for (const g of confirmedGroups) {
    const row = rowFor(g.ownerId);
    row.confirmedCount = g._count._all;
    row.revenue = Number(g._sum.grandTotal ?? 0);
  }
  for (const g of nonDraftGroups) {
    const row = rowFor(g.ownerId);
    row.quoteConversion = g._count._all > 0 ? (row.confirmedCount / g._count._all) * 100 : null;
  }
  for (const adj of discountAdjustments) {
    const ownerId = adj.quote?.ownerId;
    if (!ownerId) continue;
    const row = rowFor(ownerId);
    row.discountRequests += 1;
    if (adj.approvedById) row.discountApprovals += 1;
  }

  return [...rows.values()].sort((a, b) => b.revenue - a.revenue);
}

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
    prisma.invoice.findMany({ where: { status: { in: ["SENT", "PARTIALLY_PAID"] } }, select: { status: true, balanceDue: true, dueDate: true, paymentTerms: true } }),
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
    // Uses the same displayInvoiceStatus() the Invoices list/detail pages use — including its
    // grace period for prepaid invoices — so this figure never disagrees with what a rep sees
    // on those pages for the same invoice.
    outstandingOverdueTotal: outstandingInvoices
      .filter((i) => displayInvoiceStatus(i) === "OVERDUE")
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
