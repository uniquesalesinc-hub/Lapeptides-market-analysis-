import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * P2021 (table missing) / P2022 (column missing): the brand-kit migration
 * (20260716200000_brand_kit) has not been applied to this database yet. Every brand-kit
 * read/write path degrades gracefully behind this check so the shared live DB can run the
 * new build before the orchestrated migration lands.
 */
export function isBrandKitPendingMigration(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === "P2021" || err.code === "P2022")
  );
}

export interface BrandAssetSummary {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  note: string | null;
  createdAt: Date;
  uploadedById: string | null;
  uploadedByName: string | null;
}

export interface BrandDetails {
  brandPrimaryHex: string | null;
  brandSecondaryHex: string | null;
  brandAccentHex: string | null;
  brandFontNotes: string | null;
  brandNotes: string | null;
}

export type BrandKitData =
  | { status: "pending_migration" }
  | { status: "ok"; details: BrandDetails; assets: BrandAssetSummary[] };

/**
 * Brand details + asset list for the Customer 360 Brand tab. No viewer scoping here on
 * purpose: this is only called from the customer detail page AFTER getCustomer360 has
 * already resolved access (reps see only their own accounts, admins see all).
 */
export async function getBrandKit(customerId: string): Promise<BrandKitData> {
  try {
    const [details, assets] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        // Explicit select: these columns are globally omitted (see src/lib/prisma.ts).
        select: {
          brandPrimaryHex: true,
          brandSecondaryHex: true,
          brandAccentHex: true,
          brandFontNotes: true,
          brandNotes: true,
        },
      }),
      prisma.brandAsset.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          kind: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          note: true,
          createdAt: true,
          uploadedById: true,
          uploadedBy: { select: { name: true } },
        },
      }),
    ]);

    return {
      status: "ok",
      details: {
        brandPrimaryHex: details?.brandPrimaryHex ?? null,
        brandSecondaryHex: details?.brandSecondaryHex ?? null,
        brandAccentHex: details?.brandAccentHex ?? null,
        brandFontNotes: details?.brandFontNotes ?? null,
        brandNotes: details?.brandNotes ?? null,
      },
      assets: assets.map((a) => ({
        id: a.id,
        kind: a.kind,
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        note: a.note,
        createdAt: a.createdAt,
        uploadedById: a.uploadedById,
        uploadedByName: a.uploadedBy?.name ?? null,
      })),
    };
  } catch (err) {
    if (isBrandKitPendingMigration(err)) return { status: "pending_migration" };
    throw err;
  }
}
