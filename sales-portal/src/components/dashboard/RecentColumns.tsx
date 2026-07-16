import Link from "next/link";
import type { RecentQuoteRow } from "@/lib/data/dashboard";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { Chip, DocStatusChip } from "@/components/customers/chips";

const ACTIVITY_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  VISIT: "Visit",
  MEETING: "Meeting",
  NOTE: "Note",
};

export interface ActivityFeedRow {
  id: string;
  type: string;
  note: string;
  occurredAt: Date;
  customerId: string | null;
  customerName: string | null;
  userName: string | null;
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
      <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-lap-slate">{children}</p>;
}

function QuoteList({ rows, empty }: { rows: RecentQuoteRow[]; empty: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y divide-lap-border">
      {rows.map((q) => (
        <li key={q.id}>
          <Link
            href={`/quotes/${q.id}`}
            className="block px-4 py-3 transition-colors duration-150 hover:bg-lap-page"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-lap-ink">{q.customerName}</span>
              <span className="shrink-0 font-mono text-sm text-lap-ink">{formatMoney(q.grandTotal)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-lap-slate">
                {q.quoteNumber} · {formatDate(q.quoteDate)}
              </span>
              <DocStatusChip status={q.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ActivityList({ rows }: { rows: ActivityFeedRow[] }) {
  if (rows.length === 0) return <Empty>No activity logged yet. Touchpoints land here.</Empty>;
  return (
    <ul className="divide-y divide-lap-border">
      {rows.map((a) => (
        <li key={a.id} className="px-4 py-3">
          <div className="flex items-start gap-2">
            <Chip tone="teal">{ACTIVITY_LABELS[a.type] ?? a.type}</Chip>
            <div className="min-w-0 flex-1">
              {a.customerId && a.customerName ? (
                <Link
                  href={`/customers/${a.customerId}`}
                  className="text-sm font-medium text-lap-teal hover:underline"
                >
                  {a.customerName}
                </Link>
              ) : (
                <span className="text-sm font-medium text-lap-ink">{a.customerName ?? "Customer removed"}</span>
              )}
              <p className="mt-0.5 truncate text-sm text-lap-ink">{a.note}</p>
              <p className="mt-0.5 text-xs text-lap-slate">
                {formatDateTime(a.occurredAt)}
                {a.userName ? ` · ${a.userName}` : ""}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Three recent columns for Home: orders, activity feed, quotes. Every row links to its detail. */
export function RecentColumns({
  orders,
  activities,
  quotes,
}: {
  orders: RecentQuoteRow[];
  activities: ActivityFeedRow[];
  quotes: RecentQuoteRow[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Column title="Recent orders">
        <QuoteList rows={orders} empty="No orders yet. Accepted quotes appear here." />
      </Column>
      <Column title="Activity feed">
        <ActivityList rows={activities} />
      </Column>
      <Column title="Recent quotes">
        <QuoteList rows={quotes} empty="No quotes yet." />
      </Column>
    </div>
  );
}
