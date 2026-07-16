import { prisma } from "@/lib/prisma";
import type { Prisma, QuoteOrigin, QuoteStatus } from "@prisma/client";

export interface QuoteListFilters {
  search?: string;
  status?: QuoteStatus;
  repId?: string;
  customerId?: string;
  /** CLIENT = self-serve portal orders awaiting review; REP = staff-built quotes. */
  origin?: QuoteOrigin;
}

export async function listQuotes(viewer: { id: string; role: "ADMIN" | "SALES_REP" }, filters: QuoteListFilters = {}) {
  const where: Prisma.QuoteWhereInput = {
    ...(viewer.role === "SALES_REP" ? { ownerId: viewer.id } : filters.repId ? { ownerId: filters.repId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.origin ? { origin: filters.origin } : {}),
    ...(filters.search
      ? {
          OR: [
            { quoteNumber: { contains: filters.search, mode: "insensitive" } },
            { customer: { businessName: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  return prisma.quote.findMany({
    where,
    // origin is globally omitted (src/lib/prisma.ts, pre-migration safety); the list needs it
    // back to badge client orders, so it is re-included per-query here.
    omit: { origin: false },
    include: { customer: { select: { businessName: true } }, owner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getQuoteById(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      owner: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      adjustments: true,
      approvalRecord: true,
      invoice: { select: { id: true, invoiceNumber: true } },
    },
  });
}
