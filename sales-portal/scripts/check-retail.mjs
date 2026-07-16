// Cross-checks retail-source.ts against the portal catalog: computes gaps
// (portal SKUs without a retail price) and suspects (retail <= bulk retail T1).
import { FULL_BULK_CATALOG, SPRAYS, CREAMS, CAPSULES } from "../prisma/seed-data/pricing-source.ts";
import { RETAIL_PRICES } from "../prisma/seed-data/retail-source.ts";

const retail = new Map(RETAIL_PRICES.map(([n, s, p]) => [`${n}|${s}`, p]));
const gaps = [], suspects = [], unknown = [];

for (const item of FULL_BULK_CATALOG) {
  const key = `${item.name}|${item.size}`;
  const r = retail.get(key);
  if (r == null) { gaps.push(key); continue; }
  const t1 = item.bulkRetail[0];
  if (r <= t1) suspects.push(`${key}: retail $${r} <= bulk retail T1 $${t1}`);
  retail.delete(key);
}
for (const s of SPRAYS) {
  const key = `${s.name}|spray`; const r = retail.get(key);
  if (r == null) { gaps.push(key); continue; }
  if (r <= s.prices[0]) suspects.push(`${key}: retail $${r} <= flat $${s.prices[0]}`);
  retail.delete(key);
}
for (const c of CREAMS) {
  const key = `${c.name}|cream`; const r = retail.get(key);
  if (r == null) { gaps.push(key); continue; }
  if (r <= c.prices[0]) suspects.push(`${key}: retail $${r} <= flat $${c.prices[0]}`);
  retail.delete(key);
}
for (const c of CAPSULES) {
  const key = `${c.name}|capsules`; const r = retail.get(key);
  if (r == null) { gaps.push(key); continue; }
  if (r <= c.wholesalePrice) suspects.push(`${key}: retail $${r} <= wholesale $${c.wholesalePrice}`);
  retail.delete(key);
}
for (const k of retail.keys()) unknown.push(k);

console.log("GAPS (" + gaps.length + "):"); gaps.forEach((g) => console.log("  " + g));
console.log("SUSPECTS (" + suspects.length + "):"); suspects.forEach((s) => console.log("  " + s));
console.log("RETAIL ROWS NOT IN CATALOG (" + unknown.length + "):"); unknown.forEach((u) => console.log("  " + u));
process.exit(suspects.length + unknown.length > 0 ? 2 : 0);
