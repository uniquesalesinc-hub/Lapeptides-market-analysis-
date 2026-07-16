export function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: "warning" | "danger" | "success" }) {
  const toneClass =
    tone === "warning" ? "text-[#9A6318]" : tone === "danger" ? "text-lap-red" : tone === "success" ? "text-lap-green" : "text-lap-ink";
  return (
    <div className="card p-3">
      <p className={`font-heading text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-lap-slate">{label}</p>
    </div>
  );
}
