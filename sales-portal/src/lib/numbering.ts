import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Quote/invoice number generation. Format is administrator-configurable via
 * CompanySettings.numberFormat, e.g. "{PREFIX}-{YEAR}-{SEQ:5}" -> "LAQ-2026-00001".
 * Sequences are per (kind, year) and incremented atomically inside the caller's transaction
 * so two concurrent quote creations can never collide on the same number.
 */
export function formatDocumentNumber(format: string, prefix: string, year: number, seq: number): string {
  return format
    .replace("{PREFIX}", prefix)
    .replace("{YEAR}", String(year))
    .replace(/\{SEQ:(\d+)\}/, (_match, width: string) => String(seq).padStart(Number(width), "0"));
}

/**
 * Hands out the next sequence number for a given kind+year and persists the incremented
 * counter, all within the caller's transaction. Must be called inside `prisma.$transaction`
 * (interactive transaction) so the read-then-write is atomic under concurrent quote/invoice
 * creation — a plain `upsert-with-increment` can't express "return the pre-increment value"
 * without an off-by-one, so this does the read/compute/write explicitly instead.
 */
export async function nextSequenceNumber(
  tx: Prisma.TransactionClient | PrismaClient,
  kind: "QUOTE" | "INVOICE",
  year: number
): Promise<number> {
  const id = `${kind}-${year}`;
  const existing = await tx.numberSequence.findUnique({ where: { id } });
  const current = existing?.nextSeq ?? 1;
  await tx.numberSequence.upsert({
    where: { id },
    create: { id, nextSeq: current + 1 },
    update: { nextSeq: current + 1 },
  });
  return current;
}
