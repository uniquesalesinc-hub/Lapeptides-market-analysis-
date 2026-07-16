import type { ActivityCountsByTypeResult } from "@/lib/data/activities";
import { Chip } from "@/components/customers/chips";

const TYPE_ORDER = ["CALL", "EMAIL", "VISIT", "MEETING", "NOTE"] as const;

const TYPE_LABELS: Record<(typeof TYPE_ORDER)[number], string> = {
  CALL: "Calls",
  EMAIL: "Emails",
  VISIT: "Visits",
  MEETING: "Meetings",
  NOTE: "Notes",
};

function deltaChip(current: number, previous: number) {
  const delta = current - previous;
  if (delta > 0) return <Chip tone="green">up {delta}</Chip>;
  if (delta < 0) return <Chip tone="amber">down {Math.abs(delta)}</Chip>;
  return <Chip tone="slate">no change</Chip>;
}

/**
 * Activity counts by type, this month against the previous equal window. Each count
 * lives in a row next to its comparison, per DESIGN.md (no floating number tiles).
 */
export function EngagementStats({ counts }: { counts: ActivityCountsByTypeResult }) {
  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
      <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
        Activity this month
      </h2>
      <div className="divide-y divide-lap-border">
        {TYPE_ORDER.map((type) => (
          <div key={type} className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm font-medium text-lap-ink">{TYPE_LABELS[type]}</p>
            <div className="flex items-center gap-3">
              {deltaChip(counts.current[type], counts.previous[type])}
              <p className="w-10 text-right font-mono text-lg font-semibold text-lap-ink">
                {counts.current[type]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
