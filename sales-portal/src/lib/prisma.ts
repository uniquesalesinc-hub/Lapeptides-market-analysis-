import { PrismaClient } from "@prisma/client";

// Two global omits (Prisma omitApi):
// 1. Customer brand-kit columns: migration 20260716200000_brand_kit may not be applied to the
//    shared live database yet, and every default-select customer query (list pages, dashboard,
//    quote/order actions) would otherwise SELECT the missing columns and fail with P2022.
//    The Brand tab reads them back via an explicit select (src/lib/data/brand.ts), which is
//    wrapped to degrade gracefully pre-migration.
// 2. BrandAsset.data: multi-megabyte bytea blobs must never ride along on list queries; only
//    the authenticated serving route selects the bytes explicitly.
const createPrismaClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    omit: {
      customer: {
        brandPrimaryHex: true,
        brandSecondaryHex: true,
        brandAccentHex: true,
        brandFontNotes: true,
        brandNotes: true,
      },
      brandAsset: {
        data: true,
      },
    },
  });

// Standard Next.js dev-mode singleton so hot-reload doesn't exhaust DB connections.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
