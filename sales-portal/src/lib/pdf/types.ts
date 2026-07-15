export interface PdfCompanyInfo {
  companyName: string;
  dbaName?: string | null;
  addressLine?: string | null;
  cityStateZip?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  footerText?: string | null;
}

export interface PdfPartyAddress {
  name: string;
  contactName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  cityStateZip?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PdfLineItem {
  productName: string;
  sku: string;
  strength: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  pricingTierLabel: string;
}

export interface PdfAdjustment {
  label: string;
  amount: number;
}

export interface PdfTotals {
  subtotal: number;
  discountTotal: number;
  feeTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  depositRequired: number;
  amountPaid?: number;
  balanceDue?: number;
}

export interface QuotePdfData {
  company: PdfCompanyInfo;
  quoteNumber: string;
  quoteDate: string;
  expirationDate: string | null;
  repName: string;
  repEmail: string;
  customer: PdfPartyAddress;
  shipping: PdfPartyAddress | null;
  priceListLabel: string;
  lineItems: PdfLineItem[];
  adjustments: PdfAdjustment[];
  totals: PdfTotals;
  paymentTerms: string | null;
  customerFacingNotes: string | null;
  termsAndConditions: string | null;
  approval: {
    decision: string;
    respondentName: string;
    respondentTitle: string | null;
    decidedAt: string;
  } | null;
}

export interface InvoicePdfData {
  company: PdfCompanyInfo;
  invoiceNumber: string;
  relatedQuoteNumber: string | null;
  issueDate: string;
  dueDate: string | null;
  repName: string;
  customer: PdfPartyAddress;
  shipping: PdfPartyAddress | null;
  priceListLabel: string;
  lineItems: PdfLineItem[];
  adjustments: PdfAdjustment[];
  totals: PdfTotals;
  paymentTerms: string | null;
  paymentInstructions: string | null;
  achInstructions: string | null;
  customerFacingNotes: string | null;
  termsAndConditions: string | null;
  status: string;
}
