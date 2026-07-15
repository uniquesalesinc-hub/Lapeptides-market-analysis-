import { prisma } from "@/lib/prisma";
import type { Prisma, QuoteStatus } from "@prisma/client";

export interface QuoteListFilters {
  search?: string;
  status?: QuoteStatus;
  repId?: string;
  customerId?: string;
}

export async function listQuotes(viewer: { id: string; role: "ADMIN" | "SALES_REP" }, filters: QuoteListFilters = {}) {
  const where: Prisma.QuoteWhereInput = {
    ...(viewer.role === "SALES_REP" ? { ownerId: viewer.id } : filters.repId ? { ownerId: filters.repId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
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
