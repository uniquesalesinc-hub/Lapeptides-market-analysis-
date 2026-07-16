import type { UserRole } from "@prisma/client";

export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === "ADMIN";
}

export function canManageMasterPricing(role: UserRole | undefined | null): boolean {
  // Sales reps must never be able to alter master wholesale pricing — admin only, no exceptions.
  return isAdmin(role);
}

export function canViewAllCustomers(role: UserRole | undefined | null): boolean {
  return isAdmin(role);
}

export function canApproveDiscount(role: UserRole | undefined | null): boolean {
  return isAdmin(role);
}

/** Admin-only route prefixes enforced in middleware.ts and re-checked at the page/action level. */
export const ADMIN_ONLY_PREFIXES = ["/reps", "/pricing", "/settings", "/reports"] as const;
