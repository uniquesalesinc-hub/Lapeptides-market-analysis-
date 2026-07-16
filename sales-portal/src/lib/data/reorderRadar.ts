import { prisma } from "@/lib/prisma";
import type { QuoteStatus } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Same "order" definition as getCustomer360: quotes accepted on the spot or already invoiced. */
const ORDER_QUOTE_STATUSES: QuoteStatus[] = ["APPROVED", "CONVERTED_TO_INVOICE"];

export interface ReorderRadarInput {
  id: string;
  name: string;
  orderDates: Date[];
}

export interface ReorderRadarRow {
  customerId: string;
  name: string;
  medianGapDays: number;
  daysSinceLast: number;
  overdueBy: number;
}

/** Median of an ascending-sorted number array. Shared with the reports reorder-days math. */
export function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Pure reorder-radar math. A customer is "due" when their median gap between consecutive
 * orders has elapsed since the last order. Customers with fewer than 3 orders have no
 * reliable rhythm and are excluded; future-dated orders are noise and ignored.
 * Sorted most-overdue first.
 */
export function computeReorderDue(customers: ReorderRadarInput[], now: Date): ReorderRadarRow[] {
  const rows: ReorderRadarRow[] = [];

  for (const customer of customers) {
    const dates = customer.orderDates
      .filter((d) => d.getTime() <= now.getTime())
      .sort((a, b) => a.getTime() - b.getTime());
    const last = dates[dates.length - 1];
    if (dates.length < 3 || !last) continue;

    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const prev = dates[i - 1];
      const curr = dates[i];
      if (!prev || !curr) continue;
      gaps.push(Math.round((curr.getTime() - prev.getTime()) / DAY_MS));
    }
    gaps.sort((a, b) => a - b);

    const medianGapDays = median(gaps);
    const daysSinceLast = Math.floor((now.getTime() - last.getTime()) / DAY_MS);
    const overdueBy = daysSinceLast - medianGapDays;
    if (overdueBy < 0) continue;

    rows.push({ customerId: customer.id, name: customer.name, medianGapDays, daysSinceLast, overdueBy });
  }

  return rows.sort((a, b) => b.overdueBy - a.overdueBy);
}

/**
 * Feeds computeReorderDue from the database: order dates are the quoteDates of
 * APPROVED/CONVERTED_TO_INVOICE quotes, scoped rep-own / admin-all like every other
 * customer surface.
 */
export async function getReorderRadar(viewer: { id: string; role: "ADMIN" | "SALES_REP" }): Promise<ReorderRadarRow[]> {
  const customers = await prisma.customer.findMany({
    where: viewer.role === "SALES_REP" ? { assignedRepId: viewer.id } : {},
    select: {
      id: true,
      businessName: true,
      quotes: {
        where: { status: { in: ORDER_QUOTE_STATUSES } },
        select: { quoteDate: true },
      },
    },
  });

  return computeReorderDue(
    customers.map((c) => ({ id: c.id, name: c.businessName, orderDates: c.quotes.map((q) => q.quoteDate) })),
    new Date()
  );
}
