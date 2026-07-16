import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { ACTIVITY_LABELS } from "@/lib/data/activityLabels";
import { CsvExportButton } from "@/components/reports/CsvExportButton";

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ actorId?: string; action?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const [logs, users] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        actorId: sp.actorId || undefined,
        action: (sp.action as never) || undefined,
      },
      include: {
        actor: { select: { name: true } },
        customer: { select: { businessName: true } },
        quote: { select: { quoteNumber: true } },
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const csvRows = logs.map((l) => ({
    Timestamp: formatDateTime(l.createdAt),
    Action: ACTIVITY_LABELS[l.action],
    User: l.actor?.name ?? "System",
    Customer: l.customer?.businessName ?? "",
    Quote: l.quote?.quoteNumber ?? "",
    Invoice: l.invoice?.invoiceNumber ?? "",
    Description: l.description ?? "",
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Activity Log</h1>
        <CsvExportButton filename="activity-log.csv" rows={csvRows} />
      </div>

      <form className="flex gap-2" method="get">
        <select name="actorId" defaultValue={sp.actorId ?? ""} className="input-field">
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary !min-h-0 !px-4 !py-2 text-sm">
          Filter
        </button>
      </form>

      <ul className="card divide-y divide-brand-border p-4">
        {logs.map((l) => (
          <li key={l.id} className="py-2 text-sm first:pt-0 last:pb-0">
            <p className="text-white">{ACTIVITY_LABELS[l.action]}</p>
            <p className="text-xs text-brand-slate-400">
              {l.actor?.name ?? "System"} · {formatDateTime(l.createdAt)}
              {l.customer ? ` · ${l.customer.businessName}` : ""}
              {l.quote ? ` · ${l.quote.quoteNumber}` : ""}
              {l.invoice ? ` · ${l.invoice.invoiceNumber}` : ""}
            </p>
            {l.description && <p className="text-xs text-brand-slate-400">{l.description}</p>}
          </li>
        ))}
        {logs.length === 0 && <p className="py-4 text-center text-sm text-brand-slate-400">No activity recorded yet.</p>}
      </ul>
    </div>
  );
}
