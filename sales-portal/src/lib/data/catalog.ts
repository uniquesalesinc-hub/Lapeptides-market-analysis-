import { prisma } from "@/lib/prisma";
import type { PriceListCode, ProductCategory } from "@prisma/client";

export const PRICE_LIST_LABELS: Record<PriceListCode, string> = {
  // Retail-band model (JJ 7/16/2026): 1-19 units price at lapeptides.net retail on both
  // ladders; the printed tiers apply from 20. Labels describe the LADDER, not the band.
  BULK_RETAIL: "Bulk Retail (tiers from 20)",
  BULK_WHOLESALE: "Bulk Wholesale (bands from 20)",
  WHOLESALE_SPRAYS: "Wholesale Sprays",
  WHOLESALE_CREAMS: "Wholesale Creams",
  WHOLESALE_CAPSULES: "Wholesale Capsules",
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

/**
 * The wizard's quotable catalog: injectables from the chosen ladder (Bulk Retail vs Bulk
 * Wholesale) plus sprays, creams, and capsules, which always price from their own dedicated
 * sheets. The four queries are disjoint by category, so a plain concat cannot duplicate.
 */
export async function getWizardCatalog(ladderCode: PriceListCode): Promise<CatalogProduct[]> {
  const injectableLadder: PriceListCode =
    ladderCode === "BULK_RETAIL" || ladderCode === "BULK_WHOLESALE" ? ladderCode : "BULK_RETAIL";
  const [injectables, sprays, creams, capsules] = await Promise.all([
    getCatalog(injectableLadder),
    getCatalog("WHOLESALE_SPRAYS"),
    getCatalog("WHOLESALE_CREAMS"),
    getCatalog("WHOLESALE_CAPSULES"),
  ]);
  return [...injectables, ...sprays, ...creams, ...capsules];
}

// ---------------------------------------------------------------------------
// Product detail page
// ---------------------------------------------------------------------------

/** Format products always price from their dedicated sheet, whatever the injectable ladder. */
const FORMAT_SHEETS: Partial<Record<ProductCategory, PriceListCode>> = {
  NASAL_SPRAY: "WHOLESALE_SPRAYS",
  TOPICAL_CREAM: "WHOLESALE_CREAMS",
  CAPSULE: "WHOLESALE_CAPSULES",
};

export interface ProductDetailData {
  id: string;
  name: string;
  category: ProductCategory;
  description: string | null;
  imageUrl: string | null;
  /**
   * Priced variants keyed by injectable ladder. Format products (sprays/creams/capsules)
   * carry their dedicated sheet's tiers under BOTH keys so the detail page renders the
   * same truth regardless of the session's active ladder.
   */
  byLadder: Record<"BULK_RETAIL" | "BULK_WHOLESALE", CatalogVariant[]>;
}

/**
 * One product with its active variants and full tier entries for both ladders - the
 * server payload for /products/[id]. Returns null (page 404s) for unknown, inactive,
 * or entirely unpriced products.
 */
export async function getProductDetail(productId: string): Promise<ProductDetailData | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          priceListEntries: {
            where: { priceList: { isActive: true } },
            include: { pricingTier: true, priceList: { select: { code: true } } },
          },
        },
      },
    },
  });
  if (!product || !product.isActive) return null;

  const formatSheet = FORMAT_SHEETS[product.category];
  const variantsFor = (code: PriceListCode): CatalogVariant[] =>
    product.variants
      .map((v) => {
        const tierPrices = v.priceListEntries
          .filter((e) => e.priceList.code === code)
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
      })
      .filter((v) => v.tierPrices.length > 0);

  const byLadder = {
    BULK_RETAIL: variantsFor(formatSheet ?? "BULK_RETAIL"),
    BULK_WHOLESALE: variantsFor(formatSheet ?? "BULK_WHOLESALE"),
  };
  if (byLadder.BULK_RETAIL.length === 0 && byLadder.BULK_WHOLESALE.length === 0) return null;

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    imageUrl: product.imageUrl,
    byLadder,
  };
}

// ---------------------------------------------------------------------------
// Order Mode rails: "Most ordered" / "Trending this quarter" / "Previously purchased"
// ---------------------------------------------------------------------------

export interface OrderRails {
  /** Top variant ids by total ordered quantity, all time, best first. */
  mostOrdered: string[];
  /** Top variant ids by quantity ordered in the last 90 days, best first. */
  trending: string[];
}

export interface PurchaseHistoryEntry {
  variantId: string;
  totalQuantity: number;
  lastQuantity: number;
  lastUnitPrice: number;
  /** ISO date string of the most recent purchase (serializable to client components). */
  lastDate: string;
}

/** Invoices in these states never happened commercially - exclude them from demand data. */
const DEAD_INVOICE_STATUSES = ["CANCELLED", "VOIDED"] as const;

/**
 * Aggregate ordered quantity per variant from the two places an accepted order can live:
 * invoice lines (every invoice not cancelled/voided) plus quote lines on APPROVED quotes that
 * have no invoice yet. Converted quotes are counted once, through their invoice.
 */
async function orderedQuantityByVariant(since?: Date): Promise<Map<string, number>> {
  const createdFilter = since ? { createdAt: { gte: since } } : {};
  const [invoiceGroups, quoteGroups] = await Promise.all([
    prisma.invoiceLineItem.groupBy({
      by: ["productVariantId"],
      where: {
        productVariantId: { not: null },
        invoice: { status: { notIn: [...DEAD_INVOICE_STATUSES] } },
        ...createdFilter,
      },
      _sum: { quantity: true },
    }),
    prisma.quoteLineItem.groupBy({
      by: ["productVariantId"],
      where: {
        productVariantId: { not: null },
        quote: { status: "APPROVED", invoice: { is: null } },
        ...createdFilter,
      },
      _sum: { quantity: true },
    }),
  ]);

  const totals = new Map<string, number>();
  for (const group of [...invoiceGroups, ...quoteGroups]) {
    if (!group.productVariantId) continue;
    totals.set(group.productVariantId, (totals.get(group.productVariantId) ?? 0) + (group._sum.quantity ?? 0));
  }
  return totals;
}

function topVariantIds(totals: Map<string, number>, take: number): string[] {
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([variantId]) => variantId);
}

export async function getOrderRails(take = 8): Promise<OrderRails> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [allTime, recent] = await Promise.all([
    orderedQuantityByVariant(),
    orderedQuantityByVariant(since),
  ]);
  return { mostOrdered: topVariantIds(allTime, take), trending: topVariantIds(recent, take) };
}

/**
 * Everything one customer has actually bought, keyed by variant, most recent first -
 * powers the "Previously purchased" rail and the "2 @ $110 on Apr 29" line on product cards.
 */
export async function getPreviouslyPurchased(customerId: string): Promise<PurchaseHistoryEntry[]> {
  const lineSelect = {
    productVariantId: true,
    quantity: true,
    unitPrice: true,
    createdAt: true,
  } as const;
  const [invoiceLines, quoteLines] = await Promise.all([
    prisma.invoiceLineItem.findMany({
      where: {
        productVariantId: { not: null },
        invoice: { customerId, status: { notIn: [...DEAD_INVOICE_STATUSES] } },
      },
      select: lineSelect,
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.quoteLineItem.findMany({
      where: {
        productVariantId: { not: null },
        quote: { customerId, status: "APPROVED", invoice: { is: null } },
      },
      select: lineSelect,
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const byVariant = new Map<string, PurchaseHistoryEntry>();
  const all = [...invoiceLines, ...quoteLines].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  for (const line of all) {
    if (!line.productVariantId) continue;
    const existing = byVariant.get(line.productVariantId);
    if (existing) {
      existing.totalQuantity += line.quantity;
    } else {
      byVariant.set(line.productVariantId, {
        variantId: line.productVariantId,
        totalQuantity: line.quantity,
        lastQuantity: line.quantity,
        lastUnitPrice: Number(line.unitPrice),
        lastDate: line.createdAt.toISOString(),
      });
    }
  }
  return [...byVariant.values()];
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
