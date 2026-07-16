import { Document, Page } from "@react-pdf/renderer";
import {
  PdfHeader,
  PdfParties,
  PdfLineItemsTable,
  PdfTotalsBlock,
  PdfTextSection,
  PdfFooter,
  pdfStyles,
} from "./components";
import type { InvoicePdfData } from "./types";

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document title={`Invoice ${data.invoiceNumber}`}>
      <Page size="LETTER" style={pdfStyles.page}>
        <PdfHeader
          company={data.company}
          docTitle="INVOICE"
          docNumber={data.invoiceNumber}
          metaLines={[
            data.relatedQuoteNumber ? `Quote: ${data.relatedQuoteNumber}` : "",
            `Issued: ${data.issueDate}`,
            data.dueDate ? `Due: ${data.dueDate}` : "Due on receipt (prepaid)",
            `Status: ${data.status}`,
          ].filter(Boolean)}
        />

        <PdfParties billing={data.customer} shipping={data.shipping} repName={data.repName} />

        <PdfLineItemsTable items={data.lineItems} />

        <PdfTotalsBlock adjustments={data.adjustments} totals={data.totals} depositLabel="Deposit required" />

        {data.paymentTerms && <PdfTextSection label="Payment Terms" text={data.paymentTerms} />}
        {data.paymentInstructions && <PdfTextSection label="Payment Instructions" text={data.paymentInstructions} />}
        {data.achInstructions && <PdfTextSection label="ACH Instructions" text={data.achInstructions} />}
        {data.customerFacingNotes && <PdfTextSection label="Notes" text={data.customerFacingNotes} />}
        {data.termsAndConditions && <PdfTextSection label="Terms & Conditions" text={data.termsAndConditions} />}

        <PdfFooter company={data.company} />
      </Page>
    </Document>
  );
}
