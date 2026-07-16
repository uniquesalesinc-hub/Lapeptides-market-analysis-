import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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
