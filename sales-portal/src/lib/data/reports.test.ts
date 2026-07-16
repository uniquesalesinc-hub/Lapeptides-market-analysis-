import { describe, expect, it } from "vitest";
import { describeReportFilters, groupQuotesByMonth, parseReportFilters, parseProductSort } from "./reports";

describe("parseReportFilters", () => {
  it("parses every supported param", () => {
    const f = parseReportFilters({
      from: "2026-06-16",
      to: "2026-07-16",
      customerId: "c1",
      repId: "u1",
      priceList: "BULK_RETAIL",
    });
    expect(f.from?.getFullYear()).toBe(2026);
    expect(f.from?.getMonth()).toBe(5);
    expect(f.from?.getDate()).toBe(16);
    expect(f.to?.getMonth()).toBe(6);
    expect(f.customerId).toBe("c1");
    expect(f.repId).toBe("u1");
    expect(f.priceListCode).toBe("BULK_RETAIL");
  });

  it("drops malformed dates and unknown price lists instead of throwing", () => {
    expect(parseReportFilters({ from: "16-06-2026", to: "not-a-date", priceList: "WHOLESALE_SPRAYS" })).toEqual({});
    expect(parseReportFilters({})).toEqual({});
  });
});

describe("parseProductSort", () => {
  it("accepts revenue and customers, defaults everything else to qty", () => {
    expect(parseProductSort("revenue")).toBe("revenue");
    expect(parseProductSort("customers")).toBe("customers");
    expect(parseProductSort("qty")).toBe("qty");
    expect(parseProductSort("bogus")).toBe("qty");
    expect(parseProductSort(undefined)).toBe("qty");
  });
});

describe("groupQuotesByMonth", () => {
  it("buckets by business-timezone month with confirmed/draft splits, newest first", () => {
    const rows = groupQuotesByMonth([
      { quoteDate: new Date("2026-07-10T18:00:00Z"), status: "APPROVED", grandTotal: 100 },
      { quoteDate: new Date("2026-07-12T18:00:00Z"), status: "CONVERTED_TO_INVOICE", grandTotal: 250 },
      { quoteDate: new Date("2026-07-14T18:00:00Z"), status: "DRAFT", grandTotal: 40 },
      { quoteDate: new Date("2026-06-05T18:00:00Z"), status: "SENT", grandTotal: 75 },
    ]);
    expect(rows).toEqual([
      { month: "Jul 2026", totalQuotes: 3, confirmedCount: 2, confirmedAmount: 350, draftCount: 1 },
      { month: "Jun 2026", totalQuotes: 1, confirmedCount: 0, confirmedAmount: 0, draftCount: 0 },
    ]);
  });

  it("assigns a quote near midnight UTC to its Phoenix month", () => {
    // 2026-07-01T03:00Z is still June 30 in America/Phoenix (UTC-7).
    const rows = groupQuotesByMonth([{ quoteDate: new Date("2026-07-01T03:00:00Z"), status: "SENT", grandTotal: 10 }]);
    expect(rows[0]?.month).toBe("Jun 2026");
  });
});

describe("describeReportFilters", () => {
  it("states the window and every active dimension in words", () => {
    const filters = parseReportFilters({ from: "2026-06-16", to: "2026-07-16" });
    expect(describeReportFilters(filters, { repName: "Danny", priceListLabel: "Bulk Retail" })).toBe(
      "Jun 16, 2026 - Jul 16, 2026, Danny, Bulk Retail"
    );
  });

  it("says all time when no window is set", () => {
    expect(describeReportFilters({})).toBe("all time");
    expect(describeReportFilters(parseReportFilters({ from: "2026-01-01" }))).toBe("since Jan 1, 2026");
  });
});
