export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="font-semibold text-lap-ink">{title}</p>
      {description && <p className="text-sm text-lap-slate">{description}</p>}
      {action}
    </div>
  );
}
