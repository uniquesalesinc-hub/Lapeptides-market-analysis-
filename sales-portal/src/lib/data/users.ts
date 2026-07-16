import { prisma } from "@/lib/prisma";

export async function listSalesReps() {
  return prisma.user.findMany({
    where: { role: "SALES_REP" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, status: true, discountLimitPercent: true, createdAt: true, lastLoginAt: true },
  });
}

/** id + name only, active reps: feeds the admin sidebar "Sales rep view" section. */
export async function listActiveSalesRepNames() {
  return prisma.user.findMany({
    where: { role: "SALES_REP", status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listAllUsers() {
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      discountLimitPercent: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { customers: true, quotes: true, invoices: true } },
    },
  });
}
