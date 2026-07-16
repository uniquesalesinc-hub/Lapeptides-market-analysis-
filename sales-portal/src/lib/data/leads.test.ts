import { describe, expect, it } from "vitest";
import { matchLeadType, leadDecisionPatch } from "./leads";

describe("matchLeadType", () => {
  it("flags existing customer by email domain+company match", () => {
    const existing = [{ id: "c1", email: "front@scottsdalewell.com", businessName: "Scottsdale Wellness" }];
    expect(matchLeadType({ email: "owner@scottsdalewell.com", company: "Scottsdale Wellness" }, existing)).toEqual({ type: "EXISTING", matchedCustomerId: "c1" });
  });
  it("returns NEW when nothing matches", () => {
    expect(matchLeadType({ email: "a@b.com", company: "Nope" }, [])).toEqual({ type: "NEW", matchedCustomerId: null });
  });
});

describe("leadDecisionPatch", () => {
  it("APPROVED requires a customerId and stamps reviewer", () => {
    const p = leadDecisionPatch({ decision: "APPROVED", customerId: "c9", reviewerId: "u1", now: new Date("2026-07-16T12:00:00Z") });
    expect(p).toMatchObject({ status: "APPROVED", createdCustomerId: "c9", reviewedById: "u1" });
    expect(p.reviewedAt.toISOString()).toBe("2026-07-16T12:00:00.000Z");
  });
  it("REJECTED never carries a customerId", () => {
    expect(leadDecisionPatch({ decision: "REJECTED", reviewerId: "u1", now: new Date() }).createdCustomerId).toBeNull();
  });
});
