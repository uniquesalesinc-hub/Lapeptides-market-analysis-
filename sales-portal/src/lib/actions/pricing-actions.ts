"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { parsePricingCsv } from "@/lib/pricing/csv";
import type { PriceListCode } from "@prisma/client";

export async function toggleVariantActive(variantId: string, isActive: boolean) {
  const admin = await requireAdmin();
  const variant = await prisma.productVariant.update({ where: { id: variantId }, data: { isActive } });
  await prisma.activityLog.create({
    data: {
      action: "ADMIN_PRICING_UPDATE",
      actorId: admin.id,
      description: `SKU ${variant.sku} ${isActive ? "activated" : "deactivated"}`,
    },
  });
  revalidatePath("/pricing");
  revalidatePath("/products");
  return { ok: true };
}

const descriptionSchema = z.object({
  description: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
});

export async function updateProductDescription(productId: string, input: z.infer<typeof descriptionSchema>) {
  const admin = await requireAdmin();
  const parsed = descriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };

  const product = await prisma.product.update({
    where: { id: productId },
    data: { description: parsed.data.description || null, internalNotes: parsed.data.internalNotes || null },
  });
  await prisma.activityLog.create({
    data: { action: "ADMIN_PRICING_UPDATE", actorId: admin.id, description: `${product.name} description updated` },
  });
  revalidatePath("/pricing");
  revalidatePath("/products");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// CSV pricing upload — preview (diff) then publish
// ---------------------------------------------------------------------------

export interface PricingDiffRow {
  sku: string;
  productName: string;
  tierLabel: string;
  oldPrice: number | null;
  newPrice: number;
  changed: boolean;
}

export interface PricingUploadPreview {
  ok: boolean;
  message?: string;
  diff?: PricingDiffRow[];
  unmatchedSkus?: string[];
  parseErrors?: string[];
}

export async function previewPricingUpload(priceListCode: PriceListCode, csvText: string): Promise<PricingUploadPreview> {
  await requireAdmin();
  const { rows, errors } = parsePricingCsv(csvText);
  if (rows.length === 0) return { ok: false, message: "No valid rows found.", parseErrors: errors };

  const activeList = await prisma.priceList.findFirst({
    where: { code: priceListCode, isActive: true },
    include: { tiers: { orderBy: { tierNumber: "asc" } }, entries: { include: { productVariant: { include: { product: true } } } } },
  });
  if (!activeList) return { ok: false, message: "No active price list found for this code." };

  const variantsBySku = new Map(
    (await prisma.productVariant.findMany({ where: { sku: { in: rows.map((r) => r.sku) } }, include: { product: true } })).map((v) => [v.sku, v])
  );

  const diff: PricingDiffRow[] = [];
  const unmatchedSkus: string[] = [];

  for (const row of rows) {
    const variant = variantsBySku.get(row.sku);
    if (!variant) {
      unmatchedSkus.push(row.sku);
      continue;
    }
    activeList.tiers.forEach((tier, idx) => {
      const newPrice = row.prices[idx];
      if (newPrice == null) return;
      const oldEntry = activeList.entries.find((e) => e.productVariantId === variant.id && e.pricingTierId === tier.id);
      const oldPrice = oldEntry ? Number(oldEntry.unitPrice) : null;
      diff.push({
        sku: row.sku,
        productName: variant.product.name,
        tierLabel: tier.label,
        oldPrice,
        newPrice,
        changed: oldPrice !== newPrice,
      });
    });
  }

  return { ok: true, diff, unmatchedSkus, parseErrors: errors };
}

export async function publishPricingUpload(
  priceListCode: PriceListCode,
  csvText: string,
  fileName: string,
  effectiveDate: string
): Promise<{ ok: boolean; message?: string }> {
  const admin = await requireAdmin();
  const { rows } = parsePricingCsv(csvText);
  if (rows.length === 0) return { ok: false, message: "No valid rows to publish." };

  const currentList = await prisma.priceList.findFirst({
    where: { code: priceListCode, isActive: true },
    include: { tiers: { orderBy: { tierNumber: "asc" } }, entries: true },
  });
  if (!currentList) return { ok: false, message: "No active price list found for this code." };

  const variantsBySku = new Map(
    (await prisma.productVariant.findMany({ where: { sku: { in: rows.map((r) => r.sku) } } })).map((v) => [v.sku, v])
  );

  await prisma.$transaction(async (tx) => {
    const source = await tx.uploadedPricingSource.create({
      data: {
        fileName,
        priceListCode,
        uploadedById: admin.id,
        status: "PUBLISHED",
        effectiveDate: new Date(effectiveDate),
        parsedRowCount: rows.length,
      },
    });

    const newList = await tx.priceList.create({
      data: {
        code: priceListCode,
        name: `${currentList.name.split(" — ")[0]} — ${formatDate(new Date(effectiveDate))}`,
        effectiveDate: new Date(effectiveDate),
        isActive: true,
        sourceId: source.id,
      },
    });

    const newTiers = await Promise.all(
      currentList.tiers.map((t) =>
        tx.pricingTier.create({
          data: {
            priceListId: newList.id,
            tierNumber: t.tierNumber,
            label: t.label,
            minimumBasis: t.minimumBasis,
            minQty: t.minQty,
            maxQty: t.maxQty,
          },
        })
      )
    );

    // Start from the old list's prices, then overlay whatever the CSV specifies — SKUs not
    // present in the upload keep their previous price rather than being dropped.
    const carryForward = new Map(currentList.entries.map((e) => [`${e.productVariantId}:${e.pricingTierId}`, Number(e.unitPrice)]));
    const oldTierByNumber = new Map(currentList.tiers.map((t) => [t.tierNumber, t]));

    for (const row of rows) {
      const variant = variantsBySku.get(row.sku);
      if (!variant) continue;
      newTiers.forEach((newTier, idx) => {
        const oldTier = oldTierByNumber.get(newTier.tierNumber);
        if (!oldTier) return;
        const key = `${variant.id}:${oldTier.id}`;
        const price = row.prices[idx];
        if (price != null) carryForward.set(key, price);
      });
    }

    // Re-key carried-forward map from old tier IDs to new tier IDs (same tierNumber).
    const oldTierIdToNew = new Map(currentList.tiers.map((t) => [t.id, newTiers.find((nt) => nt.tierNumber === t.tierNumber)!]));
    for (const [key, price] of carryForward.entries()) {
      const [variantId, oldTierId] = key.split(":");
      const newTier = oldTierIdToNew.get(oldTierId!);
      if (!newTier) continue;
      await tx.priceListEntry.create({
        data: { priceListId: newList.id, pricingTierId: newTier.id, productVariantId: variantId!, unitPrice: price },
      });
    }

    await tx.priceList.update({ where: { id: currentList.id }, data: { isActive: false } });
    await tx.activityLog.create({
      data: {
        action: "ADMIN_PRICING_UPDATE",
        actorId: admin.id,
        description: `Published new ${priceListCode} price list (${rows.length} SKUs updated) effective ${effectiveDate}`,
      },
    });
  });

  revalidatePath("/pricing");
  revalidatePath("/products");
  return { ok: true };
}
