import Link from "next/link";
import { getEffectiveViewer } from "@/lib/viewAs";
import { listQuotes } from "@/lib/data/quotes";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatMoney } from "@/lib/format";
import { QuoteListFilters } from "@/components/quotes/QuoteListFilters";
import type { QuoteStatus } from "@prisma/client";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await getEffectiveViewer();
  const sp = await searchParams;
  const quotes = await listQuotes(user, { search: sp.q, status: sp.status as QuoteStatus | undefined });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-lap-ink">Quotes</h1>
        <Link href="/quotes/new" className="btn-primary !min-h-0 !px-4 !py-2 text-sm">
          + New
        </Link>
      </div>

      <QuoteListFilters defaultSearch={sp.q} defaultStatus={sp.status} />

      {quotes.length === 0 ? (
        <EmptyState title="No quotes yet" description="Create your first quote to get started." />
      ) : (
        <ul className="space-y-2">
          {quotes.map((q) => (
            <li key={q.id}>
              <Link href={`/quotes/${q.id}`} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-mono text-sm text-lap-ink">{q.quoteNumber}</p>
                  <p className="text-sm text-lap-slate">{q.customer.businessName}</p>
                  <p className="text-xs text-lap-slate">{formatDate(q.quoteDate)} · {q.owner.name}</p>
                </div>
                <div className="text-right">
                  <p className="mb-1 font-mono font-semibold text-lap-ink">{formatMoney(Number(q.grandTotal))}</p>
                  <StatusBadge status={q.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
