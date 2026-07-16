import { describe, expect, it } from "vitest";
import { portalUserTransition } from "./portalUserTransitions";

describe("portalUserTransition: invite", () => {
  it("PENDING_INVITE + invite -> INVITED", () => {
    expect(portalUserTransition("PENDING_INVITE", "invite")).toEqual({ ok: true, status: "INVITED" });
  });
  it("INVITED + invite -> INVITED (resend is allowed)", () => {
    expect(portalUserTransition("INVITED", "invite")).toEqual({ ok: true, status: "INVITED" });
  });
  it("ACTIVE + invite is rejected (already logging in)", () => {
    const result = portalUserTransition("ACTIVE", "invite");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already active/i);
  });
  it("DISABLED + invite stays DISABLED with an error", () => {
    const result = portalUserTransition("DISABLED", "invite");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/disabled/i);
  });
});

describe("portalUserTransition: disable / enable", () => {
  it("any non-disabled status + disable -> DISABLED", () => {
    for (const status of ["PENDING_INVITE", "INVITED", "ACTIVE"] as const) {
      expect(portalUserTransition(status, "disable")).toEqual({ ok: true, status: "DISABLED" });
    }
  });
  it("DISABLED + disable is rejected", () => {
    expect(portalUserTransition("DISABLED", "disable").ok).toBe(false);
  });
  it("enable restores ACTIVE when the user has logged in before", () => {
    expect(portalUserTransition("DISABLED", "enable", { hasLoggedIn: true, wasInvited: true })).toEqual({
      ok: true,
      status: "ACTIVE",
    });
  });
  it("enable restores ACTIVE when the user holds a password, even if never logged in", () => {
    expect(portalUserTransition("DISABLED", "enable", { hasPassword: true })).toEqual({
      ok: true,
      status: "ACTIVE",
    });
  });
  it("enable restores INVITED when invited but never logged in", () => {
    expect(portalUserTransition("DISABLED", "enable", { hasLoggedIn: false, wasInvited: true })).toEqual({
      ok: true,
      status: "INVITED",
    });
  });
  it("enable restores PENDING_INVITE when never invited nor logged in", () => {
    expect(portalUserTransition("DISABLED", "enable", { hasLoggedIn: false, wasInvited: false })).toEqual({
      ok: true,
      status: "PENDING_INVITE",
    });
  });
  it("enable on a non-disabled user is rejected", () => {
    expect(portalUserTransition("ACTIVE", "enable").ok).toBe(false);
  });
});

describe("portalUserTransition: login", () => {
  it("INVITED + first login -> ACTIVE", () => {
    expect(portalUserTransition("INVITED", "login")).toEqual({ ok: true, status: "ACTIVE" });
  });
  it("ACTIVE + login stays ACTIVE", () => {
    expect(portalUserTransition("ACTIVE", "login")).toEqual({ ok: true, status: "ACTIVE" });
  });
  it("PENDING_INVITE + login is rejected (no credentials issued yet)", () => {
    expect(portalUserTransition("PENDING_INVITE", "login").ok).toBe(false);
  });
  it("DISABLED + login is rejected", () => {
    const result = portalUserTransition("DISABLED", "login");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/disabled/i);
  });
});
