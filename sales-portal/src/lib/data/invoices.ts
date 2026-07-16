import { prisma } from "@/lib/prisma";
import type { Prisma, InvoiceStatus } from "@prisma/client";

export interface InvoiceListFilters {
  search?: string;
  status?: InvoiceStatus;
  repId?: string;
  customerId?: string;
  unpaidOnly?: boolean;
}

export async function listInvoices(viewer: { id: string; role: "ADMIN" | "SALES_REP" }, filters: InvoiceListFilters = {}) {
  const where: Prisma.InvoiceWhereInput = {
    ...(viewer.role === "SALES_REP" ? { ownerId: viewer.id } : filters.repId ? { ownerId: filters.repId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.unpaidOnly ? { status: { in: ["SENT", "PARTIALLY_PAID"] } } : {}),
    ...(filters.search
      ? {
          OR: [
            { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
            { customer: { businessName: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  return prisma.invoice.findMany({
    where,
    include: { customer: { select: { businessName: true } }, owner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      owner: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      adjustments: true,
      payments: { orderBy: { paidAt: "desc" } },
      quote: { select: { id: true, quoteNumber: true } },
    },
  });
}
