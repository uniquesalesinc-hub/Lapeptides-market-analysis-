export function formatMoney(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return num.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Date rendering is pinned to the business's home timezone (Arizona, no DST). Without an
// explicit timeZone, the server (UTC on Vercel) and the browser (local) render DIFFERENT
// strings for the same instant near midnight UTC — a React hydration mismatch that
// white-screens any client component showing a date (seen live on /reps, 7/15 evening).
const BUSINESS_TZ = "America/Phoenix";

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: BUSINESS_TZ });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: BUSINESS_TZ,
  });
}

export function daysUntil(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = date.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
