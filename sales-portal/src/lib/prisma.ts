import { PrismaClient } from "@prisma/client";

// Three global omits (Prisma omitApi):
// 1. Customer brand-kit columns: migration 20260716200000_brand_kit may not be applied to the
//    shared live database yet, and every default-select customer query (list pages, dashboard,
//    quote/order actions) would otherwise SELECT the missing columns and fail with P2022.
//    The Brand tab reads them back via an explicit select (src/lib/data/brand.ts), which is
//    wrapped to degrade gracefully pre-migration.
// 2. BrandAsset.data: multi-megabyte bytea blobs must never ride along on list queries; only
//    the authenticated serving route selects the bytes explicitly.
// 3. Quote client-portal columns (origin, ruoAcknowledgedAt): same pre-migration story as the
//    brand columns — migration 20260716230000_client_portal may not be applied yet, and every
//    default-select quote query (lists, dashboard, quote actions) would otherwise fail with
//    P2022. Client-order surfaces read them back via an explicit select once the migration lands.
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
      quote: {
        origin: true,
        ruoAcknowledgedAt: true,
      },
    },
  });

// Standard Next.js dev-mode singleton so hot-reload doesn't exhaust DB connections.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
