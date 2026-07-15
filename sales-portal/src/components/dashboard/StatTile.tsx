export function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: "warning" | "danger" | "success" }) {
  const toneClass =
    tone === "warning" ? "text-brand-warning" : tone === "danger" ? "text-brand-danger" : tone === "success" ? "text-brand-success" : "text-white";
  return (
    <div className="card p-3">
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="text-xs text-brand-slate-400">{label}</p>
    </div>
  );
}
