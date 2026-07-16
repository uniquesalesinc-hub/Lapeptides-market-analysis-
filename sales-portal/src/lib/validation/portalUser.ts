import { z } from "zod";

// Client-portal login accounts (PortalUser) — separate surface from staff Users on purpose.
// Passwords here belong to wholesale buyers, hashed with bcryptjs exactly like seed users.

const passwordField = z.string().min(8, "Password must be at least 8 characters.");

export const createPortalUserSchema = z.object({
  customerId: z.string().min(1, "Select the customer this login belongs to."),
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Enter a valid email address."),
  // Optional at creation: with a password the account is immediately usable (ACTIVE);
  // left blank it is created as PENDING_INVITE for the invite flow to activate later.
  password: z.union([passwordField, z.literal("")]).optional(),
});

export const portalUserIdSchema = z.object({
  portalUserId: z.string().min(1),
});

export const resetPortalUserPasswordSchema = z.object({
  portalUserId: z.string().min(1),
  password: passwordField,
});

export type CreatePortalUserValues = z.infer<typeof createPortalUserSchema>;
export type ResetPortalUserPasswordValues = z.infer<typeof resetPortalUserPasswordSchema>;
