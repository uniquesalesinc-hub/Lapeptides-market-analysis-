/**
 * Standard page header: Outfit title, optional supporting line, optional actions slot.
 * Server-component friendly (no client hooks).
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-lap-ink">{title}</h1>
        {description && <p className="mt-1 max-w-[72ch] text-sm text-lap-slate">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
