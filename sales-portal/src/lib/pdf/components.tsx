import { StyleSheet, Text, View, Svg, Path } from "@react-pdf/renderer";
import { pdfTheme } from "./theme";
import type { PdfAdjustment, PdfCompanyInfo, PdfLineItem, PdfPartyAddress, PdfTotals } from "./types";

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, fontFamily: "Helvetica", color: pdfTheme.slate900 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandName: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  brandTeal: { color: pdfTheme.teal },
  companyBlock: { textAlign: "right", fontSize: 8.5, color: pdfTheme.slate600, lineHeight: 1.4 },
  docTitleBlock: { textAlign: "right" },
  docTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: pdfTheme.teal, marginBottom: 2 },
  docMeta: { fontSize: 8.5, color: pdfTheme.slate600, lineHeight: 1.4 },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 12 },
  partyBox: { flex: 1, borderWidth: 1, borderColor: pdfTheme.border, borderRadius: 4, padding: 8 },
  partyLabel: { fontSize: 7.5, textTransform: "uppercase", color: pdfTheme.slate400, marginBottom: 3, letterSpacing: 0.5 },
  partyName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  partyLine: { fontSize: 8.5, color: pdfTheme.slate600, lineHeight: 1.4 },
  table: { borderWidth: 1, borderColor: pdfTheme.border, borderRadius: 4, marginBottom: 14 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: pdfTheme.teal, paddingVertical: 5, paddingHorizontal: 6 },
  tableHeaderCell: { color: "#ffffff", fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", paddingRight: 6 },
  tableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: pdfTheme.border,
  },
  tableCell: { fontSize: 8.5, paddingRight: 6 },
  tableCellTier: { fontSize: 7, color: pdfTheme.slate400, marginTop: 1 },
  totalsBlock: { marginLeft: "auto", width: 220, marginBottom: 14 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totalsLabel: { fontSize: 9, color: pdfTheme.slate600 },
  totalsValue: { fontSize: 9 },
  totalsGrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: pdfTheme.slate900,
    marginTop: 3,
    paddingTop: 4,
  },
  totalsGrandLabel: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  totalsGrandValue: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 12 },
  sectionLabel: { fontSize: 8, textTransform: "uppercase", color: pdfTheme.slate400, marginBottom: 3, letterSpacing: 0.5 },
  sectionText: { fontSize: 8.5, color: pdfTheme.slate600, lineHeight: 1.5 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: pdfTheme.border,
    paddingTop: 8,
    fontSize: 7,
    color: pdfTheme.slate400,
    textAlign: "center",
  },
  disclaimer: { fontSize: 7, color: pdfTheme.slate400, textAlign: "center", marginTop: 2 },
});

export function PdfLogoMark() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M12 2L22 20H2L12 2Z" fill={pdfTheme.teal} />
    </Svg>
  );
}

export function PdfHeader({
  company,
  docTitle,
  docNumber,
  metaLines,
}: {
  company: PdfCompanyInfo;
  docTitle: string;
  docNumber: string;
  metaLines: string[];
}) {
  return (
    <View style={styles.headerRow}>
      <View>
        <View style={styles.logoRow}>
          <PdfLogoMark />
          <Text style={styles.brandName}>
            LA <Text style={styles.brandTeal}>PEPTIDES</Text>
          </Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={styles.companyBlock}>
            {company.addressLine ? `${company.addressLine}\n` : ""}
            {company.cityStateZip ? `${company.cityStateZip}\n` : ""}
            {company.phone ? `${company.phone}\n` : ""}
            {company.email ? `${company.email}\n` : ""}
            {company.website ?? ""}
          </Text>
        </View>
      </View>
      <View style={styles.docTitleBlock}>
        <Text style={styles.docTitle}>{docTitle}</Text>
        <Text style={styles.docMeta}>{docNumber}</Text>
        {metaLines.map((line, i) => (
          <Text key={i} style={styles.docMeta}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

function PartyBlock({ label, party }: { label: string; party: PdfPartyAddress }) {
  return (
    <View style={styles.partyBox}>
      <Text style={styles.partyLabel}>{label}</Text>
      <Text style={styles.partyName}>{party.name}</Text>
      {party.contactName && <Text style={styles.partyLine}>{party.contactName}</Text>}
      {party.addressLine1 && <Text style={styles.partyLine}>{party.addressLine1}</Text>}
      {party.addressLine2 && <Text style={styles.partyLine}>{party.addressLine2}</Text>}
      {party.cityStateZip && <Text style={styles.partyLine}>{party.cityStateZip}</Text>}
      {party.email && <Text style={styles.partyLine}>{party.email}</Text>}
      {party.phone && <Text style={styles.partyLine}>{party.phone}</Text>}
    </View>
  );
}

export function PdfParties({
  billing,
  shipping,
  repName,
  repEmail,
}: {
  billing: PdfPartyAddress;
  shipping: PdfPartyAddress | null;
  repName?: string;
  repEmail?: string;
}) {
  return (
    <View style={styles.partiesRow}>
      <PartyBlock label="Bill To" party={billing} />
      <PartyBlock label="Ship To" party={shipping ?? billing} />
      {repName && (
        <PartyBlock
          label="Sales Representative"
          party={{ name: repName, email: repEmail }}
        />
      )}
    </View>
  );
}

export function PdfLineItemsTable({ items }: { items: PdfLineItem[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderCell, { width: "34%" }]}>Product</Text>
        <Text style={[styles.tableHeaderCell, { width: "20%" }]}>SKU</Text>
        <Text style={[styles.tableHeaderCell, { width: "11%" }]}>Strength</Text>
        <Text style={[styles.tableHeaderCell, { width: "8%", textAlign: "right" }]}>Qty</Text>
        <Text style={[styles.tableHeaderCell, { width: "13%", textAlign: "right" }]}>Unit Price</Text>
        <Text style={[styles.tableHeaderCell, { width: "14%", textAlign: "right", paddingRight: 0 }]}>Total</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.tableRow} wrap={false}>
          <View style={{ width: "34%" }}>
            <Text style={styles.tableCell}>{item.productName}</Text>
            <Text style={styles.tableCellTier}>{item.pricingTierLabel}</Text>
          </View>
          <Text style={[styles.tableCell, { width: "20%", fontFamily: "Courier", fontSize: 7.5 }]}>{item.sku}</Text>
          <Text style={[styles.tableCell, { width: "11%" }]}>{item.strength}</Text>
          <Text style={[styles.tableCell, { width: "8%", textAlign: "right" }]}>{item.quantity}</Text>
          <Text style={[styles.tableCell, { width: "13%", textAlign: "right" }]}>{money(item.unitPrice)}</Text>
          <Text style={[styles.tableCell, { width: "14%", textAlign: "right", fontFamily: "Helvetica-Bold", paddingRight: 0 }]}>
            {money(item.lineTotal)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function PdfTotalsBlock({ adjustments, totals, depositLabel }: { adjustments: PdfAdjustment[]; totals: PdfTotals; depositLabel?: string }) {
  return (
    <View style={styles.totalsBlock}>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Subtotal</Text>
        <Text style={styles.totalsValue}>{money(totals.subtotal)}</Text>
      </View>
      {adjustments.map((a, i) => (
        <View key={i} style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>{a.label}</Text>
          <Text style={styles.totalsValue}>
            {a.amount >= 0 ? "" : "-"}
            {money(Math.abs(a.amount))}
          </Text>
        </View>
      ))}
      <View style={styles.totalsGrandRow}>
        <Text style={styles.totalsGrandLabel}>Total</Text>
        <Text style={styles.totalsGrandValue}>{money(totals.grandTotal)}</Text>
      </View>
      {totals.depositRequired > 0 && (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>{depositLabel ?? "Deposit required"}</Text>
          <Text style={styles.totalsValue}>{money(totals.depositRequired)}</Text>
        </View>
      )}
      {totals.amountPaid != null && totals.amountPaid > 0 && (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Amount paid</Text>
          <Text style={styles.totalsValue}>-{money(totals.amountPaid)}</Text>
        </View>
      )}
      {totals.balanceDue != null && (
        <View style={[styles.totalsRow, { borderTopWidth: 1, borderTopColor: pdfTheme.border, marginTop: 2, paddingTop: 4 }]}>
          <Text style={[styles.totalsLabel, { fontFamily: "Helvetica-Bold", color: pdfTheme.slate900 }]}>Balance due</Text>
          <Text style={[styles.totalsValue, { fontFamily: "Helvetica-Bold" }]}>{money(totals.balanceDue)}</Text>
        </View>
      )}
    </View>
  );
}

export function PdfTextSection({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

export function PdfFooter({ company }: { company: PdfCompanyInfo }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {company.companyName}
        {company.website ? ` · ${company.website}` : ""}
        {company.phone ? ` · ${company.phone}` : ""}
      </Text>
      <Text style={styles.disclaimer}>
        {company.footerText ??
          "All prices in USD per unit. For research purposes only. Products not for human consumption."}
      </Text>
    </View>
  );
}

export const pdfStyles = styles;
export { money };
