import { randomBytes } from "node:crypto";

/**
 * Generates a cryptographically-random, unguessable token for public-facing links (quote and
 * invoice approval URLs). Prisma's `cuid()` — used for every other primary key in this schema —
 * is fine for internal IDs but is not a security credential: it embeds a timestamp, a
 * monotonic counter, and a host fingerprint alongside only a handful of random characters,
 * which narrows the search space for anyone trying to guess a link. This uses the same
 * 256-bit `randomBytes` approach already used for password-reset tokens.
 */
export function generatePublicToken(): string {
  return randomBytes(32).toString("hex");
}
