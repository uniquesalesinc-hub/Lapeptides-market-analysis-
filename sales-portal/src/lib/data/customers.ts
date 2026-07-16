import { prisma } from "@/lib/prisma";
import type { Prisma, QuoteStatus } from "@prisma/client";

export interface CustomerListFilters {
  search?: string;
  repId?: string; // admin filter by rep; reps are always scoped to themselves regardless
  customerType?: string;
}

export async function listCustomers(
  viewer: { id: string; role: "ADMIN" | "SALES_REP" },
  filters: CustomerListFilters = {}
) {
  const where: Prisma.CustomerWhereInput = {
    ...(viewer.role === "SALES_REP" ? { assignedRepId: viewer.id } : filters.repId ? { assignedRepId: filters.repId } : {}),
    ...(filters.customerType ? { customerType: filters.customerType as never } : {}),
    ...(filters.search
      ? {
          OR: [
            { businessName: { contains: filters.search, mode: "insensitive" } },
            { contactName: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.customer.findMany({
    where,
    include: {
      assignedRep: { select: { name: true } },
      _count: { select: { quotes: true, invoices: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Customer rows for the Order Mode drawer. Explicit select on purpose: the Prisma schema
 * already declares the Phase-1 CRM columns (crmStatus etc.) but the shared database may not
 * have them yet, and a default-select findMany would ask for every declared column and fail.
 * This query only touches columns that exist in the live DB today.
 */
export async function listOrderModeCustomers(viewer: { id: string; role: "ADMIN" | "SALES_REP" }) {
  return prisma.customer.findMany({
    where: viewer.role === "SALES_REP" ? { assignedRepId: viewer.id } : {},
    select: {
      id: true,
      businessName: true,
      billingCity: true,
      defaultPriceListCode: true,
      paymentTerms: true,
      _count: { select: { invoices: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRecentCustomers(viewer: { id: string; role: "ADMIN" | "SALES_REP" }, take = 5) {
  return prisma.customer.findMany({
    where: viewer.role === "SALES_REP" ? { assignedRepId: viewer.id } : {},
    orderBy: { updatedAt: "desc" },
    take,
  });
}

/**
 * id + name only, admin-wide, most recently active first: feeds the admin sidebar
 * "Customer view" section (capped small; the section has its own client-side filter).
 */
export async function listCustomerNamesByRecentActivity(take = 30) {
  const rows = await prisma.customer.findMany({
    orderBy: { updatedAt: "desc" },
    take,
    select: { id: true, businessName: true },
  });
  return rows.map((c) => ({ id: c.id, name: c.businessName }));
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      assignedRep: { select: { id: true, name: true } },
      quotes: { orderBy: { createdAt: "desc" }, take: 20 },
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

/** Quote statuses that count as orders: quotes accepted on the spot or already invoiced. */
const ORDER_QUOTE_STATUSES: QuoteStatus[] = ["APPROVED", "CONVERTED_TO_INVOICE"];

export type Customer360Result =
  | { status: "not_found" }
  | { status: "denied" }
  | {
      status: "ok";
      customer: NonNullable<Awaited<ReturnType<typeof findCustomer360Facts>>>;
      stats: {
        totalRevenue: number;
        orderCount: number;
        quoteCount: number;
        openDraftCount: number;
        lastOrderDate: Date | null;
      };
      recent: {
        orders: Customer360Quote[];
        quotes: Customer360Quote[];
        invoices: Customer360Invoice[];
        activities: Customer360Activity[];
        tasks: Customer360Task[];
      };
    };

export interface Customer360Quote {
  id: string;
  quoteNumber: string;
  quoteDate: Date;
  status: string;
  grandTotal: number;
}

export interface Customer360Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date | null;
  status: string;
  grandTotal: number;
}

export interface Customer360Activity {
  id: string;
  type: string;
  note: string;
  occurredAt: Date;
  userName: string | null;
}

export interface Customer360Task {
  id: string;
  title: string;
  note: string | null;
  dueDate: Date;
  priority: string;
  status: string;
  assigneeName: string | null;
}

function findCustomer360Facts(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: { assignedRep: { select: { id: true, name: true } } },
  });
}

/**
 * Everything the Customer 360 page needs in one call: facts, commercial settings,
 * revenue/order aggregates, and the latest ten rows per history tab. Access mirrors the
 * customer detail rule everywhere else: reps see only their own accounts, admins see all.
 */
export async function getCustomer360(
  id: string,
  viewer: { id: string; role: "ADMIN" | "SALES_REP" }
): Promise<Customer360Result> {
  const customer = await findCustomer360Facts(id);
  if (!customer) return { status: "not_found" };
  if (viewer.role === "SALES_REP" && customer.assignedRepId !== viewer.id) return { status: "denied" };

  const orderWhere: Prisma.QuoteWhereInput = { customerId: id, status: { in: ORDER_QUOTE_STATUSES } };
  const [revenueAgg, orderCount, quoteCount, openDraftCount, orderRows, quoteRows, invoiceRows, activityRows, taskRows] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: { customerId: id, status: { not: "CANCELLED" } },
        _sum: { grandTotal: true },
      }),
      prisma.quote.count({ where: orderWhere }),
      prisma.quote.count({ where: { customerId: id } }),
      prisma.quote.count({ where: { customerId: id, status: "DRAFT" } }),
      prisma.quote.findMany({
        where: orderWhere,
        orderBy: { quoteDate: "desc" },
        take: 10,
        select: { id: true, quoteNumber: true, quoteDate: true, status: true, grandTotal: true },
      }),
      prisma.quote.findMany({
        where: { customerId: id },
        orderBy: { quoteDate: "desc" },
        take: 10,
        select: { id: true, quoteNumber: true, quoteDate: true, status: true, grandTotal: true },
      }),
      prisma.invoice.findMany({
        where: { customerId: id },
        orderBy: { issueDate: "desc" },
        take: 10,
        select: { id: true, invoiceNumber: true, issueDate: true, dueDate: true, status: true, grandTotal: true },
      }),
      prisma.activity.findMany({
        where: { customerId: id },
        orderBy: { occurredAt: "desc" },
        take: 10,
        include: { user: { select: { name: true } } },
      }),
      prisma.task.findMany({
        where: { customerId: id },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        take: 10,
        include: { assignee: { select: { name: true } } },
      }),
    ]);

  const toQuote = (q: (typeof quoteRows)[number]): Customer360Quote => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    quoteDate: q.quoteDate,
    status: q.status,
    grandTotal: Number(q.grandTotal),
  });

  return {
    status: "ok",
    customer,
    stats: {
      totalRevenue: Number(revenueAgg._sum.grandTotal ?? 0),
      orderCount,
      quoteCount,
      openDraftCount,
      lastOrderDate: orderRows[0]?.quoteDate ?? null,
    },
    recent: {
      orders: orderRows.map(toQuote),
      quotes: quoteRows.map(toQuote),
      invoices: invoiceRows.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        status: inv.status,
        grandTotal: Number(inv.grandTotal),
      })),
      activities: activityRows.map((a) => ({
        id: a.id,
        type: a.type,
        note: a.note,
        occurredAt: a.occurredAt,
        userName: a.user?.name ?? null,
      })),
      tasks: taskRows.map((t) => ({
        id: t.id,
        title: t.title,
        note: t.note,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
        assigneeName: t.assignee?.name ?? null,
      })),
    },
  };
}

/** Simple, practical duplicate check: fuzzy match on business name or exact email match. */
export async function findPossibleDuplicates(businessName: string, email?: string | null) {
  const normalized = businessName.trim();
  if (normalized.length < 3 && !email) return [];
  return prisma.customer.findMany({
    where: {
      OR: [
        normalized.length >= 3 ? { businessName: { contains: normalized, mode: "insensitive" } } : undefined,
        email ? { email: { equals: email, mode: "insensitive" } } : undefined,
      ].filter(Boolean) as Prisma.CustomerWhereInput[],
    },
    take: 5,
    select: { id: true, businessName: true, email: true, contactName: true },
  });
}
