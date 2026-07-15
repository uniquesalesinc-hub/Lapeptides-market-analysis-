import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import type { QuotePdfData, InvoicePdfData, PdfCompanyInfo, PdfPartyAddress } from "./types";

async function getCompany(): Promise<PdfCompanyInfo> {
  const settings = await prisma.companySettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
  const cityStateZip = [settings.city, settings.state].filter(Boolean).join(", ") + (settings.postalCode ? ` ${settings.postalCode}` : "");
  return {
    companyName: settings.dbaName || settings.companyName,
    dbaName: settings.dbaName,
    addressLine: settings.addressLine1,
    cityStateZip: cityStateZip.trim() || null,
    phone: settings.phone,
    email: settings.email,
    website: settings.website,
    footerText: settings.pdfFooterText,
  };
}

function billingAddress(customer: {
  businessName: string;
  contactName: string;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  email: string | null;
  phone: string | null;
}): PdfPartyAddress {
  const cityStateZip = [customer.billingCity, customer.billingState].filter(Boolean).join(", ") + (customer.billingPostalCode ? ` ${customer.billingPostalCode}` : "");
  return {
    name: customer.businessName,
    contactName: customer.contactName,
    addressLine1: customer.billingAddressLine1,
    addressLine2: customer.billingAddressLine2,
    cityStateZip: cityStateZip.trim() || null,
    email: customer.email,
    phone: customer.phone,
  };
}

function shippingAddress(customer: {
  businessName: string;
  contactName: string;
  shippingSameAsBilling: boolean;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
}): PdfPartyAddress | null {
  if (customer.shippingSameAsBilling) return null;
  const cityStateZip = [customer.shippingCity, customer.shippingState].filter(Boolean).join(", ") + (customer.shippingPostalCode ? ` ${customer.shippingPostalCode}` : "");
  return {
    name: customer.businessName,
    contactName: customer.contactName,
    addressLine1: customer.shippingAddressLine1,
    addressLine2: customer.shippingAddressLine2,
    cityStateZip: cityStateZip.trim() || null,
  };
}

export async function mapQuoteToPdfData(quoteId: string): Promise<QuotePdfData | null> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { customer: true, owner: true, lineItems: true, adjustments: true, approvalRecord: true },
  });
  if (!quote) return null;
  const company = await getCompany();

  return {
    company,
    quoteNumber: quote.quoteNumber,
    quoteDate: formatDate(quote.quoteDate),
    expirationDate: quote.expirationDate ? formatDate(quote.expirationDate) : null,
    repName: quote.owner.name,
    repEmail: quote.owner.email,
    customer: billingAddress(quote.customer),
    shipping: shippingAddress(quote.customer),
    priceListLabel: PRICE_LIST_LABELS[quote.priceListCode],
    lineItems: quote.lineItems.map((li) => ({
      productName: li.productName,
      sku: li.sku,
      strength: li.strength,
      quantity: li.quantity,
      unitPrice: Number(li.unitPrice),
      lineTotal: Number(li.lineTotal),
      pricingTierLabel: li.pricingTierLabel,
    })),
    adjustments: quote.adjustments.map((a) => ({ label: a.label, amount: Number(a.amount) })),
    totals: {
      subtotal: Number(quote.subtotal),
      discountTotal: Number(quote.discountTotal),
      feeTotal: Number(quote.feeTotal),
      shippingTotal: Number(quote.shippingTotal),
      taxTotal: Number(quote.taxTotal),
      grandTotal: Number(quote.grandTotal),
      depositRequired: Number(quote.depositRequired),
    },
    paymentTerms: quote.paymentTerms,
    // Deliberately excludes quote.internalNotes — internal notes must never appear on a
    // customer-facing document.
    customerFacingNotes: quote.customerFacingNotes,
    termsAndConditions: quote.termsAndConditions,
    approval: quote.approvalRecord
      ? {
          decision: quote.approvalRecord.decision,
          respondentName: quote.approvalRecord.respondentName,
          respondentTitle: quote.approvalRecord.respondentTitle,
          decidedAt: formatDate(quote.approvalRecord.decidedAt),
        }
      : null,
  };
}

export async function mapInvoiceToPdfData(invoiceId: string): Promise<InvoicePdfData | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, owner: true, lineItems: true, adjustments: true, quote: { select: { quoteNumber: true } } },
  });
  if (!invoice) return null;
  const company = await getCompany();

  return {
    company,
    invoiceNumber: invoice.invoiceNumber,
    relatedQuoteNumber: invoice.quote?.quoteNumber ?? null,
    issueDate: formatDate(invoice.issueDate),
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : null,
    repName: invoice.owner.name,
    customer: billingAddress(invoice.customer),
    shipping: shippingAddress(invoice.customer),
    priceListLabel: PRICE_LIST_LABELS[invoice.priceListCode],
    lineItems: invoice.lineItems.map((li) => ({
      productName: li.productName,
      sku: li.sku,
      strength: li.strength,
      quantity: li.quantity,
      unitPrice: Number(li.unitPrice),
      lineTotal: Number(li.lineTotal),
      pricingTierLabel: li.pricingTierLabel,
    })),
    adjustments: invoice.adjustments.map((a) => ({ label: a.label, amount: Number(a.amount) })),
    totals: {
      subtotal: Number(invoice.subtotal),
      discountTotal: Number(invoice.discountTotal),
      feeTotal: Number(invoice.feeTotal),
      shippingTotal: Number(invoice.shippingTotal),
      taxTotal: Number(invoice.taxTotal),
      grandTotal: Number(invoice.grandTotal),
      depositRequired: Number(invoice.depositRequired),
      amountPaid: Number(invoice.amountPaid),
      balanceDue: Number(invoice.balanceDue),
    },
    paymentTerms: invoice.paymentTerms,
    paymentInstructions: invoice.paymentInstructions,
    achInstructions: invoice.achInstructions,
    customerFacingNotes: invoice.customerFacingNotes,
    termsAndConditions: null,
    status: invoice.status,
  };
}
