import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getReportsData } from "@/lib/data/reports";
import { StatTile } from "@/components/dashboard/StatTile";
import { CsvExportButton } from "@/components/reports/CsvExportButton";
import { formatDate, formatMoney } from "@/lib/format";

export default async function ReportsPage() {
  await requireAdmin();
  const data = await getReportsData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Reports</h1>
        <Link href="/reports/activity" className="text-sm text-brand-teal">
          Activity Log →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total quoted value" value={formatMoney(data.totalQuotedValue)} />
        <StatTile label="Total invoiced value" value={formatMoney(data.totalInvoicedValue)} />
        <StatTile label="Quote conversion rate" value={`${data.conversionRate.toFixed(1)}%`} />
        <StatTile label="Outstanding balance" value={formatMoney(data.outstandingTotal)} tone="warning" />
      </div>

      <ReportSection
        title="Quotes by Representative"
        filename="quotes-by-rep.csv"
        rows={data.quotesByRep.map((r) => ({ Representative: r.repName, Quotes: r.count, Total: r.total.toFixed(2) }))}
      >
        <Table headers={["Representative", "Quotes", "Total"]}>
          {data.quotesByRep.map((r, i) => (
            <tr key={i} className="border-t border-brand-border">
              <td className="py-1.5 pr-3">{r.repName}</td>
              <td className="py-1.5 pr-3">{r.count}</td>
              <td className="py-1.5">{formatMoney(r.total)}</td>
            </tr>
          ))}
        </Table>
      </ReportSection>

      <ReportSection
        title="Invoices by Representative"
        filename="invoices-by-rep.csv"
        rows={data.invoicesByRep.map((r) => ({ Representative: r.repName, Invoices: r.count, Total: r.total.toFixed(2) }))}
      >
        <Table headers={["Representative", "Invoices", "Total"]}>
          {data.invoicesByRep.map((r, i) => (
            <tr key={i} className="border-t border-brand-border">
              <td className="py-1.5 pr-3">{r.repName}</td>
              <td className="py-1.5 pr-3">{r.count}</td>
              <td className="py-1.5">{formatMoney(r.total)}</td>
            </tr>
          ))}
        </Table>
      </ReportSection>

      <ReportSection
        title="Discounts by Representative"
        filename="discounts-by-rep.csv"
        rows={data.discountsByRep.map((r) => ({ Representative: r.repName, TotalDiscounted: r.total.toFixed(2) }))}
      >
        <Table headers={["Representative", "Total discounted"]}>
          {data.discountsByRep.map((r, i) => (
            <tr key={i} className="border-t border-brand-border">
              <td className="py-1.5 pr-3">{r.repName}</td>
              <td className="py-1.5">{formatMoney(r.total)}</td>
            </tr>
          ))}
        </Table>
      </ReportSection>

      <ReportSection
        title="Top Customers"
        filename="top-customers.csv"
        rows={data.topCustomers.map((c) => ({ Customer: c.customerName, TotalQuoted: c.total.toFixed(2) }))}
      >
        <Table headers={["Customer", "Total quoted"]}>
          {data.topCustomers.map((c, i) => (
            <tr key={i} className="border-t border-brand-border">
              <td className="py-1.5 pr-3">{c.customerName}</td>
              <td className="py-1.5">{formatMoney(c.total)}</td>
            </tr>
          ))}
        </Table>
      </ReportSection>

      <ReportSection
        title="Top Products — Quoted Quantities"
        filename="top-products-quoted.csv"
        rows={data.topProductsByQuoteQty.map((p) => ({ Product: p.productName, Quantity: p.quantity, Value: p.value.toFixed(2) }))}
      >
        <Table headers={["Product", "Qty", "Value"]}>
          {data.topProductsByQuoteQty.map((p, i) => (
            <tr key={i} className="border-t border-brand-border">
              <td className="py-1.5 pr-3">{p.productName}</td>
              <td className="py-1.5 pr-3">{p.quantity}</td>
              <td className="py-1.5">{formatMoney(p.value)}</td>
            </tr>
          ))}
        </Table>
      </ReportSection>

      <ReportSection
        title="Top Products — Invoiced Quantities"
        filename="top-products-invoiced.csv"
        rows={data.topProductsByInvoiceQty.map((p) => ({ Product: p.productName, Quantity: p.quantity, Value: p.value.toFixed(2) }))}
      >
        <Table headers={["Product", "Qty", "Value"]}>
          {data.topProductsByInvoiceQty.map((p, i) => (
            <tr key={i} className="border-t border-brand-border">
              <td className="py-1.5 pr-3">{p.productName}</td>
              <td className="py-1.5 pr-3">{p.quantity}</td>
              <td className="py-1.5">{formatMoney(p.value)}</td>
            </tr>
          ))}
        </Table>
      </ReportSection>

      <ReportSection
        title="Quotes Nearing Expiration (14 days)"
        filename="expiring-quotes.csv"
        rows={data.expiringQuotes.map((q) => ({
          Quote: q.quoteNumber,
          Customer: q.customer.businessName,
          Representative: q.owner.name,
          Expires: q.expirationDate ? formatDate(q.expirationDate) : "",
        }))}
      >
        <Table headers={["Quote", "Customer", "Expires"]}>
          {data.expiringQuotes.map((q) => (
            <tr key={q.id} className="border-t border-brand-border">
              <td className="py-1.5 pr-3 font-mono text-xs">{q.quoteNumber}</td>
              <td className="py-1.5 pr-3">{q.customer.businessName}</td>
              <td className="py-1.5 text-brand-warning">{formatDate(q.expirationDate)}</td>
            </tr>
          ))}
        </Table>
      </ReportSection>

      <ReportSection
        title="Unpaid Invoices"
        filename="unpaid-invoices.csv"
        rows={data.unpaidInvoices.map((inv) => ({
          Invoice: inv.invoiceNumber,
          Customer: inv.customer.businessName,
          BalanceDue: Number(inv.balanceDue).toFixed(2),
          DueDate: inv.dueDate ? formatDate(inv.dueDate) : "",
        }))}
      >
        <Table headers={["Invoice", "Customer", "Balance", "Due"]}>
          {data.unpaidInvoices.map((inv) => (
            <tr key={inv.id} className="border-t border-brand-border">
              <td className="py-1.5 pr-3 font-mono text-xs">{inv.invoiceNumber}</td>
              <td className="py-1.5 pr-3">{inv.customer.businessName}</td>
              <td className="py-1.5 pr-3">{formatMoney(Number(inv.balanceDue))}</td>
              <td className="py-1.5">{formatDate(inv.dueDate)}</td>
            </tr>
          ))}
        </Table>
      </ReportSection>
    </div>
  );
}

function ReportSection({
  title,
  filename,
  rows,
  children,
}: {
  title: string;
  filename: string;
  rows: Array<Record<string, string | number>>;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-white">{title}</h2>
        <CsvExportButton filename={filename} rows={rows} />
      </div>
      <div className="table-scroll">{children}</div>
    </section>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-brand-slate-400">
          {headers.map((h) => (
            <th key={h} className="py-1 pr-3 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
