export interface ParsedCsvRow {
  sku: string;
  prices: number[]; // one per tier, in tier order
}

/** Format: `sku,tier1,tier2,...` — a header row followed by one row per SKU. */
export function parsePricingCsv(csvText: string): { rows: ParsedCsvRow[]; errors: string[] } {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  const errors: string[] = [];
  const rows: ParsedCsvRow[] = [];
  if (lines.length < 2) {
    return { rows: [], errors: ["File must have a header row and at least one data row."] };
  }
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    const sku = cols[0];
    if (!sku) {
      errors.push(`Row ${i + 1}: missing SKU.`);
      continue;
    }
    const prices = cols.slice(1).map((c) => Number(c));
    if (prices.some((p) => Number.isNaN(p) || p < 0)) {
      errors.push(`Row ${i + 1} (${sku}): invalid price value.`);
      continue;
    }
    rows.push({ sku, prices });
  }
  return { rows, errors };
}
