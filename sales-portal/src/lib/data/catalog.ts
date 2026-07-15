import { prisma } from "@/lib/prisma";
import type { PriceListCode, ProductCategory } from "@prisma/client";

export const PRICE_LIST_LABELS: Record<PriceListCode, string> = {
  BULK_RETAIL: "Bulk Retail",
  BULK_WHOLESALE: "Bulk Wholesale",
  WHOLESALE_SPRAYS: "Wholesale Sprays",
  WHOLESALE_CREAMS: "Wholesale Creams",
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  INJECTABLE_PEPTIDE: "Injectable Peptides",
  INJECTABLE_GLP: "GLP / Metabolic",
  INJECTABLE_BIOREGULATOR: "Bio Regulators",
  INJECTABLE_BLEND: "Peptide Blends",
  NASAL_SPRAY: "Nasal Sprays",
  TOPICAL_CREAM: "Topical Creams",
  CAPSULE: "Capsules",
};

export async function getActivePriceList(code: PriceListCode) {
  return prisma.priceList.findFirst({
    where: { code, isActive: true },
    include: { tiers: { orderBy: { tierNumber: "asc" } } },
  });
}

export interface CatalogVariant {
  id: string;
  sku: string;
  size: string;
  isActive: boolean;
  tierPrices: Array<{ tierNumber: number; label: string; minQty: number; maxQty: number | null; unitPrice: number }>;
  entryPrice: number | null;
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: ProductCategory;
  description: string | null;
  imageUrl: string | null;
  variants: CatalogVariant[];
}

export async function getCatalog(
  priceListCode: PriceListCode,
  opts: { search?: string; category?: ProductCategory; includeInactive?: boolean } = {}
): Promise<CatalogProduct[]> {
  const priceList = await getActivePriceList(priceListCode);
  if (!priceList) return [];

  const products = await prisma.product.findMany({
    where: {
      category: opts.category,
      isActive: opts.includeInactive ? undefined : true,
      ...(opts.search
        ? { name: { contains: opts.search, mode: "insensitive" } }
        : {}),
    },
    include: {
      variants: {
        where: opts.includeInactive ? undefined : { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          priceListEntries: {
            where: { priceListId: priceList.id },
            include: { pricingTier: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return products
    .filter((p) => p.variants.length > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      imageUrl: p.imageUrl,
      variants: p.variants
        .filter((v) => v.priceListEntries.length > 0)
        .map((v) => {
          const tierPrices = v.priceListEntries
            .map((e) => ({
              tierNumber: e.pricingTier.tierNumber,
              label: e.pricingTier.label,
              minQty: e.pricingTier.minQty,
              maxQty: e.pricingTier.maxQty,
              unitPrice: Number(e.unitPrice),
            }))
            .sort((a, b) => a.tierNumber - b.tierNumber);
          return {
            id: v.id,
            sku: v.sku,
            size: v.size,
            isActive: v.isActive,
            tierPrices,
            entryPrice: tierPrices[0]?.unitPrice ?? null,
          };
        }),
    }))
    .filter((p) => p.variants.length > 0);
}

export async function getVariantWithPricing(variantId: string, priceListCode: PriceListCode) {
  const priceList = await getActivePriceList(priceListCode);
  if (!priceList) return null;

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: true,
      priceListEntries: {
        where: { priceListId: priceList.id },
        include: { pricingTier: true },
      },
    },
  });
  if (!variant) return null;

  const tierPrices = variant.priceListEntries
    .map((e) => ({
      tierNumber: e.pricingTier.tierNumber,
      label: e.pricingTier.label,
      minimumBasis: e.pricingTier.minimumBasis,
      minQty: e.pricingTier.minQty,
      maxQty: e.pricingTier.maxQty,
      unitPrice: Number(e.unitPrice),
    }))
    .sort((a, b) => a.tierNumber - b.tierNumber);

  return {
    id: variant.id,
    sku: variant.sku,
    size: variant.size,
    productName: variant.product.name,
    category: variant.product.category,
    priceListId: priceList.id,
    priceListName: priceList.name,
    effectiveDate: priceList.effectiveDate,
    tierPrices,
  };
}
