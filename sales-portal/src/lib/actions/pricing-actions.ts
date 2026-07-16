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

  // A CSV whose columns are in the wrong order (or from the wrong price list, or missing a
  // column) would otherwise map row.prices[idx] to the wrong tier silently — every price
  // still parses as a plausible dollar figure, so nothing else here would catch it. Column
  // *count* mismatches are the fraction of that failure mode we can actually detect
  // mechanically; a same-count reordering still relies on an admin reviewing the diff labels.
  const expectedColumns = activeList.tiers.length;
  const columnMismatches = rows.filter((r) => r.prices.length !== expectedColumns);
  if (columnMismatches.length > 0) {
    return {
      ok: false,
      message: `This price list has ${expectedColumns} tiers, but ${columnMismatches.length} row(s) have a different number of price columns (found ${columnMismatches[0]!.prices.length} for SKU ${columnMismatches[0]!.sku}). Check the CSV matches the selected price list before retrying.`,
    };
  }

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

  const variantsBySku = new Map(
    (await prisma.productVariant.findMany({ where: { sku: { in: rows.map((r) => r.sku) } } })).map((v) => [v.sku, v])
  );

  try {
    await prisma.$transaction(async (tx) => {
    // Re-fetched inside the transaction (not passed in from an earlier read) so this
    // transaction's view of "what's currently active" is as fresh as possible right before
    // it tries to publish. That alone doesn't fully close the race — two admins publishing
    // within the same instant can still both see the same current list — but the partial
    // unique index on PriceList(code) WHERE isActive (migration
    // 20260715171000_price_list_one_active_per_code) means only one of their INSERTs can
    // succeed; the loser's transaction fails atomically and is caught below instead of
    // silently leaving two active price lists for the same code.
    const currentList = await tx.priceList.findFirst({
      where: { code: priceListCode, isActive: true },
      include: { tiers: { orderBy: { tierNumber: "asc" } }, entries: true },
    });
    if (!currentList) throw new Error("NO_ACTIVE_LIST");

    const expectedColumns = currentList.tiers.length;
    const columnMismatches = rows.filter((r) => r.prices.length !== expectedColumns);
    if (columnMismatches.length > 0) {
      throw new Error(
        `COLUMN_MISMATCH:This price list has ${expectedColumns} tiers, but ${columnMismatches.length} row(s) have a different number of price columns.`
      );
    }

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
  } catch (err) {
    if (err instanceof Error && err.message === "NO_ACTIVE_LIST") {
      return { ok: false, message: "No active price list found for this code." };
    }
    if (err instanceof Error && err.message.startsWith("COLUMN_MISMATCH:")) {
      return { ok: false, message: err.message.slice("COLUMN_MISMATCH:".length) };
    }
    // Prisma's unique-constraint violation code — thrown when another publish for the same
    // price list code committed first and claimed the one-active-per-code slot.
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return {
        ok: false,
        message: "Someone else just published a new price list for this code. Refresh and try again.",
      };
    }
    throw err;
  }

  revalidatePath("/pricing");
  revalidatePath("/products");
  return { ok: true };
}
