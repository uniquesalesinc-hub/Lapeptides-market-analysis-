// Generic leaderboard table for the Reports tabs. Server-component friendly (no hooks):
// sortable headers are plain links the page composes; money cells are mono per DESIGN.md;
// the inline proportional bar is a bg-lap-teal-wash span inside the cell whose width maps
// to the row's share of the column max (never a chart lib, never a side stripe).

export interface LeaderboardColumn<Row> {
  key: string;
  /** Plain text, or a <Link> when the page wants a sortable header. */
  header: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  render: (row: Row) => React.ReactNode;
  /** 0..1 share of the column max; when set the cell renders an inline proportional bar. */
  barShare?: (row: Row) => number;
}

export function BarCell({ share, children }: { share: number; children: React.ReactNode }) {
  const width = Math.max(0, Math.min(1, share)) * 100;
  return (
    <span className="relative inline-block min-w-[7rem]">
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 rounded bg-lap-teal-wash"
        style={{ width: `${width}%` }}
      />
      <span className="relative block px-1 text-right">{children}</span>
    </span>
  );
}

export function LeaderboardTable<Row>({
  columns,
  rows,
  rowKey,
  emptyMessage,
}: {
  columns: Array<LeaderboardColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-lap-slate">{emptyMessage}</p>;
  }

  const headerCell = "px-3 py-2 text-xs font-medium uppercase tracking-wide text-lap-slate";

  return (
    <div className="overflow-x-auto p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-lap-teal-wash text-left">
            {columns.map((col, i) => (
              <th
                key={col.key}
                className={`${i === 0 ? "rounded-l-lg" : ""} ${i === columns.length - 1 ? "rounded-r-lg" : ""} ${headerCell} ${
                  col.align === "right" ? "text-right" : ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-lap-border">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors duration-150 hover:bg-lap-page">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2.5 ${col.align === "right" ? "text-right" : ""} ${
                    col.mono ? "font-mono text-lap-ink" : "text-lap-ink"
                  }`}
                >
                  {col.barShare ? <BarCell share={col.barShare(row)}>{col.render(row)}</BarCell> : col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
