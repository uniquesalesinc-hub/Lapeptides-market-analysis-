import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pure sign/verify for the admin "view as rep" cookie value. The cookie carries
 * `${repId}.${hmac}` where the hmac is HMAC-SHA256(repId, AUTH_SECRET) hex-encoded, so a
 * client cannot mint or alter a value without the server secret. Verification is
 * constant-time on the signature comparison. Kept dependency-free and side-effect-free so
 * it can be unit tested without Next.js or the database.
 */

function hmacHex(repId: string, secret: string): string {
  return createHmac("sha256", secret).update(repId).digest("hex");
}

export function signViewAs(repId: string, secret: string): string {
  return `${repId}.${hmacHex(repId, secret)}`;
}

/** Returns the rep id when the value is well-formed and correctly signed, else null. */
export function verifyViewAs(value: string, secret: string): string | null {
  if (!value || !secret) return null;
  // Rep ids are cuids (no dots); split on the LAST dot so a hostile id can't shift the mac.
  const at = value.lastIndexOf(".");
  if (at <= 0) return null; // no dot, or empty rep id
  const repId = value.slice(0, at);
  const mac = value.slice(at + 1);
  if (!/^[0-9a-f]{64}$/.test(mac)) return null;
  const expected = Buffer.from(hmacHex(repId, secret), "hex");
  const provided = Buffer.from(mac, "hex");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  return repId;
}
