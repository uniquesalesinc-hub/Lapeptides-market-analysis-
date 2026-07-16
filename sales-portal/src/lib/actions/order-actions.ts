"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getPreviouslyPurchased, type PurchaseHistoryEntry } from "@/lib/data/catalog";

/**
 * Lazy fetch for the Order Mode "Previously purchased" rail when a rep picks a customer
 * from the drawer. Reps can only read history for their own accounts; admins see any.
 */
export async function fetchCustomerPurchaseHistory(customerId: string): Promise<PurchaseHistoryEntry[]> {
  const user = await requireUser();
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { assignedRepId: true },
  });
  if (!customer) return [];
  if (user.role === "SALES_REP" && customer.assignedRepId !== user.id) return [];
  return getPreviouslyPurchased(customerId);
}
