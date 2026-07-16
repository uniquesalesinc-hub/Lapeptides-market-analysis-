import { describe, expect, it } from "vitest";
import { signClientToken, verifyClientToken, type ClientTokenPayload } from "./clientAuthToken";

const SECRET = "test-secret-please-ignore";
const NOW = 1_800_000_000; // fixed unix seconds so expiry tests are deterministic

const PAYLOAD: ClientTokenPayload = {
  pu: "cm5portaluser000000000001",
  c: "cm5customer0000000000001",
  exp: NOW + 3600,
};

function b64urlEncode(payload: ClientTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

describe("signClientToken / verifyClientToken", () => {
  it("round-trips a valid signed token back to its payload", () => {
    const token = signClientToken(PAYLOAD, SECRET);
    expect(verifyClientToken(token, SECRET, NOW)).toEqual(PAYLOAD);
  });

  it("rejects a token whose portal user id was tampered with", () => {
    const token = signClientToken(PAYLOAD, SECRET);
    const mac = token.slice(token.lastIndexOf(".") + 1);
    const forged = `${b64urlEncode({ ...PAYLOAD, pu: "cm5portaluser000000000002" })}.${mac}`;
    expect(verifyClientToken(forged, SECRET, NOW)).toBeNull();
  });

  it("rejects a token whose customer id was tampered with", () => {
    const token = signClientToken(PAYLOAD, SECRET);
    const mac = token.slice(token.lastIndexOf(".") + 1);
    const forged = `${b64urlEncode({ ...PAYLOAD, c: "cm5customer0000000000002" })}.${mac}`;
    expect(verifyClientToken(forged, SECRET, NOW)).toBeNull();
  });

  it("rejects a token whose expiry was extended without re-signing", () => {
    const token = signClientToken(PAYLOAD, SECRET);
    const mac = token.slice(token.lastIndexOf(".") + 1);
    const forged = `${b64urlEncode({ ...PAYLOAD, exp: NOW + 999_999 })}.${mac}`;
    expect(verifyClientToken(forged, SECRET, NOW)).toBeNull();
  });

  it("rejects an expired token even when correctly signed", () => {
    const token = signClientToken({ ...PAYLOAD, exp: NOW - 1 }, SECRET);
    expect(verifyClientToken(token, SECRET, NOW)).toBeNull();
    // exp exactly at now is also expired: the token is valid strictly BEFORE exp.
    const atNow = signClientToken({ ...PAYLOAD, exp: NOW }, SECRET);
    expect(verifyClientToken(atNow, SECRET, NOW)).toBeNull();
  });

  it("accepts a token right up to (but not at) its expiry", () => {
    const token = signClientToken({ ...PAYLOAD, exp: NOW + 1 }, SECRET);
    expect(verifyClientToken(token, SECRET, NOW)).toEqual({ ...PAYLOAD, exp: NOW + 1 });
  });

  it("rejects a token signed with a different secret", () => {
    const token = signClientToken(PAYLOAD, "some-other-secret");
    expect(verifyClientToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a token whose signature was flipped", () => {
    const token = signClientToken(PAYLOAD, SECRET);
    const flipped = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(verifyClientToken(flipped, SECRET, NOW)).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(verifyClientToken("", SECRET, NOW)).toBeNull();
    expect(verifyClientToken("no-dot-at-all", SECRET, NOW)).toBeNull();
    expect(verifyClientToken(".", SECRET, NOW)).toBeNull();
    expect(verifyClientToken(`${b64urlEncode(PAYLOAD)}.`, SECRET, NOW)).toBeNull();
    expect(verifyClientToken(`${b64urlEncode(PAYLOAD)}.not-hex!`, SECRET, NOW)).toBeNull();
    expect(verifyClientToken(`.${"a".repeat(64)}`, SECRET, NOW)).toBeNull();
  });

  it("rejects payloads that are not valid JSON or are missing fields, even when signed", () => {
    const missingFields = { pu: "x" } as unknown as ClientTokenPayload;
    const token = signClientToken(missingFields, SECRET);
    expect(verifyClientToken(token, SECRET, NOW)).toBeNull();
    const notJson = Buffer.from("not-json", "utf8").toString("base64url");
    expect(verifyClientToken(`${notJson}.${"a".repeat(64)}`, SECRET, NOW)).toBeNull();
  });

  it("rejects payloads with empty ids or a non-numeric expiry even when signed", () => {
    const emptyPu = signClientToken({ ...PAYLOAD, pu: "" }, SECRET);
    expect(verifyClientToken(emptyPu, SECRET, NOW)).toBeNull();
    const emptyCustomer = signClientToken({ ...PAYLOAD, c: "" }, SECRET);
    expect(verifyClientToken(emptyCustomer, SECRET, NOW)).toBeNull();
    const badExp = signClientToken({ ...PAYLOAD, exp: Number.NaN }, SECRET);
    expect(verifyClientToken(badExp, SECRET, NOW)).toBeNull();
  });

  it("rejects everything when the secret is empty", () => {
    const token = signClientToken(PAYLOAD, SECRET);
    expect(verifyClientToken(token, "", NOW)).toBeNull();
  });
});
