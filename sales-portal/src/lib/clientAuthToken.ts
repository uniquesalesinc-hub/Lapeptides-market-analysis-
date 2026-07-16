import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pure sign/verify for the client-portal session cookie (`lap_client_session`), mirroring
 * viewAsToken's HMAC discipline. The cookie carries `${base64url(JSON payload)}.${hmac}`
 * where the hmac is HMAC-SHA256(encodedPayload, AUTH_SECRET) hex-encoded, so a browser
 * cannot mint or alter a session without the server secret. Signature comparison is
 * constant-time; expiry is enforced here (server-side) on every verify. Kept
 * dependency-free and side-effect-free so it unit tests without Next.js or the database.
 *
 * This token NEVER grants access to any (portal)/rep/admin surface: requireUser and
 * requireAdmin only accept NextAuth sessions and know nothing about this cookie.
 */

export interface ClientTokenPayload {
  /** PortalUser id. */
  pu: string;
  /** Customer id the portal user belongs to (cross-checked against the DB on every request). */
  c: string;
  /** Expiry, unix seconds. The token is valid strictly BEFORE this instant. */
  exp: number;
}

function hmacHex(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("hex");
}

export function signClientToken(payload: ClientTokenPayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${hmacHex(encoded, secret)}`;
}

/**
 * Returns the payload when the value is well-formed, correctly signed, structurally valid,
 * and not expired at `now` (unix seconds, defaults to the current clock). Otherwise null.
 */
export function verifyClientToken(
  value: string,
  secret: string,
  now: number = Math.floor(Date.now() / 1000)
): ClientTokenPayload | null {
  if (!value || !secret) return null;

  // base64url never contains dots, so split on the LAST dot to isolate the mac.
  const at = value.lastIndexOf(".");
  if (at <= 0) return null; // no dot, or empty payload
  const encoded = value.slice(0, at);
  const mac = value.slice(at + 1);
  if (!/^[0-9a-f]{64}$/.test(mac)) return null;

  const expected = Buffer.from(hmacHex(encoded, secret), "hex");
  const provided = Buffer.from(mac, "hex");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const { pu, c, exp } = parsed as Record<string, unknown>;
  if (typeof pu !== "string" || pu.length === 0) return null;
  if (typeof c !== "string" || c.length === 0) return null;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  if (now >= exp) return null;

  return { pu, c, exp };
}
