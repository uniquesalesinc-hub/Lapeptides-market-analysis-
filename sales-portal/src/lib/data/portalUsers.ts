import { prisma } from "@/lib/prisma";

/**
 * Admin Portal Users tab: every client login with its owning customer, newest first.
 * PortalUser exists since Phase 1, so this never needs a pending-migration guard.
 */
export async function listPortalUsers() {
  return prisma.portalUser.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      invitedAt: true,
      lastLoginAt: true,
      lastActiveAt: true,
      createdAt: true,
      customer: { select: { id: true, businessName: true } },
    },
  });
}

/** Customer options for the "Add portal user" drawer select. */
export async function listCustomerOptions() {
  return prisma.customer.findMany({
    where: { isProspect: false },
    orderBy: { businessName: "asc" },
    select: { id: true, businessName: true },
  });
}
