import Link from "next/link";
import { requireUser } from "@/lib/session";
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
  const user = await requireUser();
  const sp = await searchParams;
  const quotes = await listQuotes(user, { search: sp.q, status: sp.status as QuoteStatus | undefined });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Quotes</h1>
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
                  <p className="font-mono text-sm text-white">{q.quoteNumber}</p>
                  <p className="text-sm text-brand-slate-400">{q.customer.businessName}</p>
                  <p className="text-xs text-brand-slate-400">{formatDate(q.quoteDate)} · {q.owner.name}</p>
                </div>
                <div className="text-right">
                  <p className="mb-1 font-semibold text-white">{formatMoney(Number(q.grandTotal))}</p>
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
