import { describe, expect, it } from "vitest";
import { signViewAs, verifyViewAs } from "./viewAsToken";

const SECRET = "test-secret-please-ignore";
const REP_ID = "cm5rep0000000000000000001";

describe("signViewAs / verifyViewAs", () => {
  it("round-trips a valid signed value back to the rep id", () => {
    const value = signViewAs(REP_ID, SECRET);
    expect(value.startsWith(`${REP_ID}.`)).toBe(true);
    expect(verifyViewAs(value, SECRET)).toBe(REP_ID);
  });

  it("rejects a value whose rep id was tampered with", () => {
    const value = signViewAs(REP_ID, SECRET);
    const [, mac] = value.split(".");
    expect(verifyViewAs(`cm5rep0000000000000000002.${mac}`, SECRET)).toBeNull();
  });

  it("rejects a value whose signature was tampered with", () => {
    const value = signViewAs(REP_ID, SECRET);
    const flipped = value.slice(0, -1) + (value.endsWith("a") ? "b" : "a");
    expect(verifyViewAs(flipped, SECRET)).toBeNull();
  });

  it("rejects a value signed with a different secret", () => {
    const value = signViewAs(REP_ID, "some-other-secret");
    expect(verifyViewAs(value, SECRET)).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(verifyViewAs("", SECRET)).toBeNull();
    expect(verifyViewAs("no-dot-at-all", SECRET)).toBeNull();
    expect(verifyViewAs(".", SECRET)).toBeNull();
    expect(verifyViewAs(`${REP_ID}.`, SECRET)).toBeNull();
    expect(verifyViewAs(`.abcdef`, SECRET)).toBeNull();
    expect(verifyViewAs(`${REP_ID}.not-hex!`, SECRET)).toBeNull();
  });

  it("rejects an empty rep id even if someone signed one", () => {
    const value = signViewAs("", SECRET);
    expect(verifyViewAs(value, SECRET)).toBeNull();
  });
});
