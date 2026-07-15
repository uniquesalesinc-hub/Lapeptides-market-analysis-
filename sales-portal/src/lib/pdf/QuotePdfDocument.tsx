import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfTheme } from "./theme";
import {
  PdfHeader,
  PdfParties,
  PdfLineItemsTable,
  PdfTotalsBlock,
  PdfTextSection,
  PdfFooter,
  pdfStyles,
} from "./components";
import type { QuotePdfData } from "./types";

const styles = StyleSheet.create({
  signatureRow: { flexDirection: "row", gap: 20, marginTop: 20 },
  signatureBox: { flex: 1, borderTopWidth: 1, borderTopColor: pdfTheme.slate900, paddingTop: 4 },
  signatureLabel: { fontSize: 7.5, color: pdfTheme.slate400 },
  approvalNote: {
    marginTop: 14,
    padding: 8,
    borderRadius: 4,
    backgroundColor: pdfTheme.tealLight,
    fontSize: 8.5,
  },
});

export function QuotePdfDocument({ data }: { data: QuotePdfData }) {
  return (
    <Document title={`Quote ${data.quoteNumber}`}>
      <Page size="LETTER" style={pdfStyles.page}>
        <PdfHeader
          company={data.company}
          docTitle="QUOTE"
          docNumber={data.quoteNumber}
          metaLines={[
            `Date: ${data.quoteDate}`,
            data.expirationDate ? `Expires: ${data.expirationDate}` : "No expiration set",
            `Price list: ${data.priceListLabel}`,
          ]}
        />

        <PdfParties billing={data.customer} shipping={data.shipping} repName={data.repName} repEmail={data.repEmail} />

        <PdfLineItemsTable items={data.lineItems} />

        <PdfTotalsBlock adjustments={data.adjustments} totals={data.totals} depositLabel="Deposit required" />

        {data.paymentTerms && <PdfTextSection label="Payment Terms" text={data.paymentTerms} />}
        {data.customerFacingNotes && <PdfTextSection label="Notes" text={data.customerFacingNotes} />}
        {data.termsAndConditions && <PdfTextSection label="Terms & Conditions" text={data.termsAndConditions} />}

        {data.approval ? (
          <View style={styles.approvalNote}>
            <Text>
              {data.approval.decision === "APPROVED" ? "Approved" : "Declined"} by {data.approval.respondentName}
              {data.approval.respondentTitle ? `, ${data.approval.respondentTitle}` : ""} on {data.approval.decidedAt}
            </Text>
          </View>
        ) : (
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Authorized Signature</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Name / Title</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Date</Text>
            </View>
          </View>
        )}

        <PdfFooter company={data.company} />
      </Page>
    </Document>
  );
}
