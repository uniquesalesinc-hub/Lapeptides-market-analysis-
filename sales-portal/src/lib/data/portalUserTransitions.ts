// Pure portal-user lifecycle rules (no Prisma) — unit-tested in portalUserTransitions.test.ts.
// The invite lifecycle on record (spec Phase 2): PENDING_INVITE -> INVITED -> ACTIVE, with
// DISABLED as a hard off-switch that must be explicitly lifted before anything else happens.

export type PortalUserStatusValue = "PENDING_INVITE" | "INVITED" | "ACTIVE" | "DISABLED";

export type PortalUserEvent = "invite" | "disable" | "enable" | "login";

export type PortalUserTransitionResult =
  | { ok: true; status: PortalUserStatusValue }
  | { ok: false; error: string };

export interface EnableContext {
  /** lastLoginAt is set — the user has working credentials and has used them. */
  hasLoggedIn?: boolean;
  /** invitedAt is set — an invite went out before the account was disabled. */
  wasInvited?: boolean;
  /** passwordHash is set — working credentials exist even if never used yet. */
  hasPassword?: boolean;
}

/**
 * Decides the next status for a portal-user lifecycle event. Callers persist the returned
 * status; an `ok: false` result means the event is invalid from the current status and
 * nothing should change.
 *
 * - invite: PENDING_INVITE/INVITED -> INVITED (resend allowed). ACTIVE and DISABLED reject.
 * - disable: anything except DISABLED -> DISABLED.
 * - enable: DISABLED only; restores the most advanced pre-disable stage we can prove from
 *   the record (logged in or password on file -> ACTIVE, invited -> INVITED, otherwise
 *   PENDING_INVITE).
 * - login: INVITED -> ACTIVE (first login activates), ACTIVE stays. PENDING_INVITE and
 *   DISABLED reject — no credentials issued yet, or access explicitly revoked.
 */
export function portalUserTransition(
  status: PortalUserStatusValue,
  event: PortalUserEvent,
  context: EnableContext = {}
): PortalUserTransitionResult {
  switch (event) {
    case "invite":
      if (status === "PENDING_INVITE" || status === "INVITED") return { ok: true, status: "INVITED" };
      if (status === "ACTIVE") return { ok: false, error: "This portal user is already active and logging in." };
      return { ok: false, error: "This portal user is disabled. Enable the account before sending an invite." };

    case "disable":
      if (status === "DISABLED") return { ok: false, error: "This portal user is already disabled." };
      return { ok: true, status: "DISABLED" };

    case "enable":
      if (status !== "DISABLED") return { ok: false, error: "Only a disabled portal user can be enabled." };
      if (context.hasLoggedIn || context.hasPassword) return { ok: true, status: "ACTIVE" };
      if (context.wasInvited) return { ok: true, status: "INVITED" };
      return { ok: true, status: "PENDING_INVITE" };

    case "login":
      if (status === "INVITED" || status === "ACTIVE") return { ok: true, status: "ACTIVE" };
      if (status === "DISABLED") return { ok: false, error: "This account is disabled. Contact your LA Peptides representative." };
      return { ok: false, error: "This account has no credentials yet. Ask for an invite or a password." };
  }
}
