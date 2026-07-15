/**
 * Development-only seed script. Populates:
 *  - Company settings
 *  - The four real wholesale price lists, tiers, and every SKU's pricing entries (sourced
 *    entirely from prisma/seed-data/pricing-source.ts — the normalized transcription of the
 *    ten uploaded PDFs)
 *  - One admin + two sales rep demo accounts
 *  - A handful of clearly-fictional demo customers, quotes, and invoices
 *
 * Demo people/business data below is invented for local development only — never real
 * customer information. Run with `npm run seed`.
 */
import { PrismaClient, PriceListCode as DbPriceListCode } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  PRICE_LIST_CODES,
  SOURCE_DISCLAIMER,
} from "./seed-data/pricing-source";
import { tiersFor, buildFullCatalogEntries } from "../src/lib/pricing/priceLists";
import { calculateLineItemPricing, calculateQuoteTotals } from "../src/lib/pricing/engine";
import { formatDocumentNumber, nextSequenceNumber } from "../src/lib/numbering";
import { generatePublicToken } from "../src/lib/security/token";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "ChangeMe123!";

async function main() {
  console.log("Seeding LA Peptides Sales Portal (development data)...");

  // 1. Company settings
  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      companyName: "LA Peptides",
      phone: "602-321-8381",
      email: "uniquesalesinc@gmail.com",
      website: "lapeptides.net",
      quotePrefix: "LAQ",
      invoicePrefix: "LAI",
      defaultPaymentTerms: "Prepaid",
      allowNetTerms: false,
      defaultTermsAndConditions:
        "All prices in USD per unit. For research purposes only. Products not for human consumption. Sprays and topical creams require a 50% deposit to confirm an order; balance due upon delivery; please allow 7-10 business days for fulfillment; all sales are final on those product lines.",
      customerApprovalLanguage:
        "By approving this quote, you confirm the billing and shipping information above is correct and accept LA Peptides' quoted pricing and terms.",
      repDiscountLimitPercent: 5,
    },
    update: {},
  });

  // 2. Users
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: "uniquesalesinc@gmail.com" },
    create: {
      email: "uniquesalesinc@gmail.com",
      name: "LA Peptides Admin",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash,
      discountLimitPercent: 100,
    },
    update: {},
  });

  const rep1 = await prisma.user.upsert({
    where: { email: "rep1@demo.lapeptides.net" },
    create: {
      email: "rep1@demo.lapeptides.net",
      name: "Jordan Reyes",
      role: "SALES_REP",
      status: "ACTIVE",
      passwordHash,
      discountLimitPercent: 5,
    },
    update: {},
  });

  const rep2 = await prisma.user.upsert({
    where: { email: "rep2@demo.lapeptides.net" },
    create: {
      email: "rep2@demo.lapeptides.net",
      name: "Casey Morgan",
      role: "SALES_REP",
      status: "ACTIVE",
      passwordHash,
      discountLimitPercent: 5,
    },
    update: {},
  });

  console.log(`Users ready. Demo password for all seeded accounts: ${DEMO_PASSWORD}`);

  // 3. Pricing sources + price lists + tiers
  const sourceFiles: Record<string, string[]> = {
    [PRICE_LIST_CODES.BULK_RETAIL]: ["BulkRetail_Tier1.pdf", "BulkRetail_Tier2.pdf", "BulkRetail_Tier3.pdf"],
    [PRICE_LIST_CODES.BULK_WHOLESALE]: [
      "BulkWholesale_Tier1.pdf",
      "BulkWholesale_Tier2.pdf",
      "BulkWholesale_Tier3.pdf",
      "BulkWholesale_Tier4.pdf",
      "BulkWholesale_Tier5.pdf",
    ],
    [PRICE_LIST_CODES.WHOLESALE_SPRAYS]: ["Wholesale_Sprays.pdf"],
    [PRICE_LIST_CODES.WHOLESALE_CREAMS]: ["Wholesale_Creams.pdf"],
    [PRICE_LIST_CODES.WHOLESALE_CAPSULES]: ["Bulk_Wholesale_Capsules_Draft.pdf"],
  };
  const listNames: Record<string, string> = {
    [PRICE_LIST_CODES.BULK_RETAIL]: "Bulk Retail — May 2026",
    [PRICE_LIST_CODES.BULK_WHOLESALE]: "Bulk Wholesale — May 2026",
    [PRICE_LIST_CODES.WHOLESALE_SPRAYS]: "Wholesale Sprays — May 2026",
    [PRICE_LIST_CODES.WHOLESALE_CREAMS]: "Wholesale Creams — May 2026",
    // Source sheet is titled "Draft" — kept visible in the name so nobody mistakes it for final.
    [PRICE_LIST_CODES.WHOLESALE_CAPSULES]: "Wholesale Capsules — May 2026 (draft sheet)",
  };

  const priceListIds: Record<string, string> = {};

  for (const code of Object.values(PRICE_LIST_CODES)) {
    const source = await prisma.uploadedPricingSource.create({
      data: {
        fileName: sourceFiles[code]!.join(", "),
        priceListCode: code as DbPriceListCode,
        uploadedById: admin.id,
        status: "PUBLISHED",
        effectiveDate: new Date("2026-05-01"),
        parsedRowCount: buildFullCatalogEntries().filter((e) => e.priceListCode === code).length,
        notes: SOURCE_DISCLAIMER,
      },
    });

    const priceList = await prisma.priceList.create({
      data: {
        code: code as DbPriceListCode,
        name: listNames[code]!,
        effectiveDate: new Date("2026-05-01"),
        isActive: true,
        sourceId: source.id,
      },
    });
    priceListIds[code] = priceList.id;

    const tierDefs = tiersFor(code as any);
    for (const t of tierDefs) {
      await prisma.pricingTier.create({
        data: {
          priceListId: priceList.id,
          tierNumber: t.tier,
          label: t.label,
          minimumBasis: t.minimumBasis,
          minQty: t.minQty,
          maxQty: t.maxQty,
        },
      });
    }
  }

  // 4. Products, variants, and price list entries
  const catalogEntries = buildFullCatalogEntries();
  const productCache = new Map<string, string>(); // `${name}::${category}` -> Product.id
  const variantCache = new Map<string, string>(); // sku -> ProductVariant.id

  for (const entry of catalogEntries) {
    const productKey = `${entry.name}::${entry.category}`;
    let productId = productCache.get(productKey);
    if (!productId) {
      const product = await prisma.product.upsert({
        where: { name_category: { name: entry.name, category: entry.category as any } },
        create: { name: entry.name, category: entry.category as any, isActive: true },
        update: {},
      });
      productId = product.id;
      productCache.set(productKey, productId);
    }

    let variantId = variantCache.get(entry.sku);
    if (!variantId) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: entry.sku },
        create: {
          productId,
          sku: entry.sku,
          size: entry.size,
          isActive: true,
          suggestedRetailPrice: entry.suggestedRetail ?? null,
        },
        update: {},
      });
      variantId = variant.id;
      variantCache.set(entry.sku, variantId);
    }

    const priceList = await prisma.priceList.findFirstOrThrow({
      where: { id: priceListIds[entry.priceListCode] },
      include: { tiers: true },
    });

    for (const tier of priceList.tiers) {
      const unitPrice = entry.pricesByTier.get(tier.tierNumber);
      if (unitPrice == null) continue;
      await prisma.priceListEntry.create({
        data: {
          priceListId: priceList.id,
          pricingTierId: tier.id,
          productVariantId: variantId,
          unitPrice,
        },
      });
    }
  }

  console.log(`Catalog seeded: ${productCache.size} products, ${variantCache.size} SKUs.`);

  // 5. Demo customers (fictional — not real customer data)
  const customerAcme = await prisma.customer.create({
    data: {
      businessName: "Acme Recovery Labs (Demo)",
      contactName: "Taylor Brooks",
      email: "taylor@acmerecoverylabs.example",
      phone: "555-0100",
      customerType: "RESELLER",
      billingAddressLine1: "100 Demo Street",
      billingCity: "Phoenix",
      billingState: "AZ",
      billingPostalCode: "85001",
      shippingSameAsBilling: true,
      defaultPriceListCode: "BULK_RETAIL",
      paymentTerms: "Prepaid",
      assignedRepId: rep1.id,
      lastContactDate: new Date(),
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const customerSummit = await prisma.customer.create({
    data: {
      businessName: "Summit Wellness Distribution (Demo)",
      contactName: "Morgan Lee",
      email: "morgan@summitwellnessdist.example",
      phone: "555-0142",
      customerType: "DISTRIBUTOR",
      billingAddressLine1: "8800 Distribution Way",
      billingCity: "Dallas",
      billingState: "TX",
      billingPostalCode: "75201",
      shippingSameAsBilling: true,
      defaultPriceListCode: "BULK_WHOLESALE",
      paymentTerms: "Prepaid",
      assignedRepId: rep2.id,
      lastContactDate: new Date(),
    },
  });

  // 6. A sample quote (draft) for rep1 / Acme, using the real pricing engine
  const bulkRetailTiers = tiersFor(PRICE_LIST_CODES.BULK_RETAIL as any);
  const bpcEntry = catalogEntries.find(
    (e) => e.sku === "BPC157-10MG" && e.priceListCode === PRICE_LIST_CODES.BULK_RETAIL
  )!;
  const ghkEntry = catalogEntries.find(
    (e) => e.sku === "GHKCU-50MG" && e.priceListCode === PRICE_LIST_CODES.BULK_RETAIL
  )!;

  const bpcPricing = calculateLineItemPricing(50, bulkRetailTiers, bpcEntry.pricesByTier);
  const ghkPricing = calculateLineItemPricing(25, bulkRetailTiers, ghkEntry.pricesByTier);
  // 25 units is below the 20-unit floor? No — 25 >= 20, qualifies Tier 1. Use 15 to also
  // demonstrate a below-minimum warning line kept as a draft (not finalized).
  const belowMinPricing = calculateLineItemPricing(15, bulkRetailTiers, ghkEntry.pricesByTier);

  const totals = calculateQuoteTotals({
    lineTotals: [bpcPricing.lineTotal!, ghkPricing.lineTotal!],
    adjustments: [
      { kind: "SHIPPING", label: "Ground shipping", valueType: "FIXED_AMOUNT", value: 25 },
      { kind: "REP_DISCOUNT", label: "New account discount", valueType: "PERCENT", value: 5 },
    ],
    depositPercent: 100, // prepaid business model
  });

  const quoteYear = new Date().getFullYear();
  const quoteSeq = await prisma.$transaction((tx) => nextSequenceNumber(tx, "QUOTE", quoteYear));
  const quoteNumber = formatDocumentNumber("{PREFIX}-{YEAR}-{SEQ:5}", "LAQ", quoteYear, quoteSeq);

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      publicToken: generatePublicToken(),
      customerId: customerAcme.id,
      ownerId: rep1.id,
      priceListCode: "BULK_RETAIL",
      status: "SENT",
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      feeTotal: totals.feeTotal,
      shippingTotal: totals.shippingTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      depositRequired: totals.depositAmount,
      paymentTerms: "Prepaid",
      customerFacingNotes: "Thank you for your business — please confirm approval to begin fulfillment.",
      sentAt: new Date(),
      sentToEmail: customerAcme.email,
      lineItems: {
        create: [
          {
            productVariantId: bpcEntry ? variantCache.get(bpcEntry.sku) : null,
            productName: "BPC-157",
            sku: bpcEntry.sku,
            strength: "10mg",
            quantity: 50,
            unitPrice: bpcPricing.unitPrice!,
            lineTotal: bpcPricing.lineTotal!,
            pricingTierLabel: bpcPricing.appliedTier!.label,
            priceListCode: "BULK_RETAIL",
            priceListName: listNames[PRICE_LIST_CODES.BULK_RETAIL]!,
            effectiveDate: new Date("2026-05-01"),
            minimumMet: true,
            minimumRequired: bpcPricing.minimumRequired,
          },
          {
            productVariantId: ghkEntry ? variantCache.get(ghkEntry.sku) : null,
            productName: "GHK-Cu",
            sku: ghkEntry.sku,
            strength: "50mg",
            quantity: 25,
            unitPrice: ghkPricing.unitPrice!,
            lineTotal: ghkPricing.lineTotal!,
            pricingTierLabel: ghkPricing.appliedTier!.label,
            priceListCode: "BULK_RETAIL",
            priceListName: listNames[PRICE_LIST_CODES.BULK_RETAIL]!,
            effectiveDate: new Date("2026-05-01"),
            minimumMet: true,
            minimumRequired: ghkPricing.minimumRequired,
          },
        ],
      },
      adjustments: {
        create: totals.resolvedAdjustments.map((a) => ({
          type: a.kind,
          label: a.label,
          valueType: a.valueType,
          value: a.value,
          amount: a.amount,
        })),
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "QUOTE_CREATED",
      actorId: rep1.id,
      customerId: customerAcme.id,
      quoteId: quote.id,
      description: `${quoteNumber} created for ${customerAcme.businessName}`,
    },
  });

  console.log(`Demo quote created: ${quoteNumber} (below-minimum example qty=15 GHK-Cu: qualifies=${belowMinPricing.qualifies})`);

  // 7. A second quote, already approved, converted to an invoice for Summit Wellness (Bulk Wholesale)
  const bulkWholesaleTiers = tiersFor(PRICE_LIST_CODES.BULK_WHOLESALE as any);
  const semaEntry = catalogEntries.find(
    (e) => e.sku === "SEMAGLUTIDE-10MG" && e.priceListCode === PRICE_LIST_CODES.BULK_WHOLESALE
  )!;
  const semaPricing = calculateLineItemPricing(300, bulkWholesaleTiers, semaEntry.pricesByTier);
  const totals2 = calculateQuoteTotals({
    lineTotals: [semaPricing.lineTotal!],
    adjustments: [{ kind: "SHIPPING", label: "Freight", valueType: "FIXED_AMOUNT", value: 150 }],
    depositPercent: 100,
  });

  const quoteSeq2 = await prisma.$transaction((tx) => nextSequenceNumber(tx, "QUOTE", quoteYear));
  const quoteNumber2 = formatDocumentNumber("{PREFIX}-{YEAR}-{SEQ:5}", "LAQ", quoteYear, quoteSeq2);

  const quote2 = await prisma.quote.create({
    data: {
      quoteNumber: quoteNumber2,
      publicToken: generatePublicToken(),
      customerId: customerSummit.id,
      ownerId: rep2.id,
      priceListCode: "BULK_WHOLESALE",
      status: "APPROVED",
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: totals2.subtotal,
      discountTotal: totals2.discountTotal,
      feeTotal: totals2.feeTotal,
      shippingTotal: totals2.shippingTotal,
      taxTotal: totals2.taxTotal,
      grandTotal: totals2.grandTotal,
      depositRequired: totals2.depositAmount,
      paymentTerms: "Prepaid",
      sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      sentToEmail: customerSummit.email,
      approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      lineItems: {
        create: [
          {
            productVariantId: variantCache.get(semaEntry.sku),
            productName: "Semaglutide",
            sku: semaEntry.sku,
            strength: "10mg",
            quantity: 300,
            unitPrice: semaPricing.unitPrice!,
            lineTotal: semaPricing.lineTotal!,
            pricingTierLabel: semaPricing.appliedTier!.label,
            priceListCode: "BULK_WHOLESALE",
            priceListName: listNames[PRICE_LIST_CODES.BULK_WHOLESALE]!,
            effectiveDate: new Date("2026-05-01"),
            minimumMet: true,
            minimumRequired: semaPricing.minimumRequired,
          },
        ],
      },
      adjustments: {
        create: totals2.resolvedAdjustments.map((a) => ({
          type: a.kind,
          label: a.label,
          valueType: a.valueType,
          value: a.value,
          amount: a.amount,
        })),
      },
      approvalRecord: {
        create: {
          decision: "APPROVED",
          respondentName: "Morgan Lee",
          respondentTitle: "Purchasing Manager",
          billingConfirmed: true,
          shippingConfirmed: true,
          termsAccepted: true,
          comments: "Approved — please proceed with fulfillment.",
        },
      },
    },
  });

  const invoiceSeq = await prisma.$transaction((tx) => nextSequenceNumber(tx, "INVOICE", quoteYear));
  const invoiceNumber = formatDocumentNumber("{PREFIX}-{YEAR}-{SEQ:5}", "LAI", quoteYear, invoiceSeq);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      publicToken: generatePublicToken(),
      quoteId: quote2.id,
      customerId: customerSummit.id,
      ownerId: rep2.id,
      priceListCode: "BULK_WHOLESALE",
      status: "SENT",
      dueDate: new Date(),
      paymentTerms: "Prepaid",
      subtotal: totals2.subtotal,
      discountTotal: totals2.discountTotal,
      feeTotal: totals2.feeTotal,
      shippingTotal: totals2.shippingTotal,
      taxTotal: totals2.taxTotal,
      grandTotal: totals2.grandTotal,
      depositRequired: totals2.depositAmount,
      amountPaid: 0,
      balanceDue: totals2.grandTotal,
      sentAt: new Date(),
      sentToEmail: customerSummit.email,
      lineItems: {
        create: [
          {
            productVariantId: variantCache.get(semaEntry.sku),
            productName: "Semaglutide",
            sku: semaEntry.sku,
            strength: "10mg",
            quantity: 300,
            unitPrice: semaPricing.unitPrice!,
            lineTotal: semaPricing.lineTotal!,
            pricingTierLabel: semaPricing.appliedTier!.label,
            priceListCode: "BULK_WHOLESALE",
            priceListName: listNames[PRICE_LIST_CODES.BULK_WHOLESALE]!,
            effectiveDate: new Date("2026-05-01"),
          },
        ],
      },
      adjustments: {
        create: totals2.resolvedAdjustments.map((a) => ({
          type: a.kind,
          label: a.label,
          valueType: a.valueType,
          value: a.value,
          amount: a.amount,
        })),
      },
    },
  });

  await prisma.quote.update({ where: { id: quote2.id }, data: { status: "CONVERTED_TO_INVOICE", convertedAt: new Date() } });

  await prisma.activityLog.createMany({
    data: [
      { action: "QUOTE_APPROVED", actorId: rep2.id, customerId: customerSummit.id, quoteId: quote2.id },
      { action: "QUOTE_CONVERTED", actorId: rep2.id, customerId: customerSummit.id, quoteId: quote2.id, invoiceId: invoice.id },
      { action: "INVOICE_CREATED", actorId: rep2.id, customerId: customerSummit.id, invoiceId: invoice.id },
      { action: "INVOICE_SENT", actorId: rep2.id, customerId: customerSummit.id, invoiceId: invoice.id },
    ],
  });

  console.log(`Demo invoice created: ${invoiceNumber}`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
