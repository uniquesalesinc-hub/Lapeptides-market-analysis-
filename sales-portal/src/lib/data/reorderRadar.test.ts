import { describe, expect, it } from "vitest";
import { computeReorderDue } from "./reorderRadar";

const NOW = new Date("2026-07-16T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

describe("computeReorderDue", () => {
  it("computes the median of consecutive order gaps (30, 34, 26 -> 30)", () => {
    // Orders at 120, 90, 56, 30 days ago: gaps of 30, 34, 26 days.
    const rows = computeReorderDue(
      [{ id: "c1", name: "Scottsdale Wellness", orderDates: [daysAgo(120), daysAgo(90), daysAgo(56), daysAgo(30)] }],
      NOW
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.medianGapDays).toBe(30);
  });

  it("reports a customer 40 days past their last order with median gap 30 as overdue by 10", () => {
    // Gaps 30, 30, 30 -> median 30; last order 40 days ago.
    const rows = computeReorderDue(
      [{ id: "c1", name: "Desert Clinic", orderDates: [daysAgo(130), daysAgo(100), daysAgo(70), daysAgo(40)] }],
      NOW
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      customerId: "c1",
      name: "Desert Clinic",
      medianGapDays: 30,
      daysSinceLast: 40,
      overdueBy: 10,
    });
  });

  it("excludes customers with fewer than 3 orders", () => {
    const rows = computeReorderDue(
      [{ id: "c1", name: "Two Orders LLC", orderDates: [daysAgo(90), daysAgo(40)] }],
      NOW
    );
    expect(rows).toEqual([]);
  });

  it("ignores future-dated orders when computing gaps and recency", () => {
    // Without the future date this is the overdue-by-10 case; a future order must not
    // reset the clock or join the gap math.
    const rows = computeReorderDue(
      [
        {
          id: "c1",
          name: "Future Noise Inc",
          orderDates: [daysAgo(130), daysAgo(100), daysAgo(70), daysAgo(40), daysAgo(-5)],
        },
      ],
      NOW
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ medianGapDays: 30, daysSinceLast: 40, overdueBy: 10 });
  });

  it("excludes customers whose median gap has not elapsed yet", () => {
    // Median 30, last order 20 days ago: not due.
    const rows = computeReorderDue(
      [{ id: "c1", name: "On Schedule Co", orderDates: [daysAgo(110), daysAgo(80), daysAgo(50), daysAgo(20)] }],
      NOW
    );
    expect(rows).toEqual([]);
  });

  it("sorts results by overdueBy descending", () => {
    const rows = computeReorderDue(
      [
        { id: "less", name: "Less Overdue", orderDates: [daysAgo(125), daysAgo(95), daysAgo(65), daysAgo(35)] },
        { id: "more", name: "More Overdue", orderDates: [daysAgo(150), daysAgo(120), daysAgo(90), daysAgo(60)] },
      ],
      NOW
    );
    expect(rows.map((r) => r.customerId)).toEqual(["more", "less"]);
    expect(rows[0]?.overdueBy ?? 0).toBeGreaterThan(rows[1]?.overdueBy ?? 0);
  });
});
