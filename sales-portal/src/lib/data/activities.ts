import { prisma } from "@/lib/prisma";
import { ActivityType } from "@prisma/client";

export interface LogActivityInput {
  type: ActivityType;
  customerId: string;
  userId: string;
  note: string;
  occurredAt?: Date;
}

/** Records a CRM touchpoint (call/email/visit/meeting/note) against a customer. */
export async function logActivity(input: LogActivityInput) {
  return prisma.activity.create({
    data: {
      type: input.type,
      customerId: input.customerId,
      userId: input.userId,
      note: input.note,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

export interface ListActivitiesFilters {
  customerId?: string;
  /** Scope to one user's touchpoints (rep-own dashboard views). */
  userId?: string;
  sinceDays?: number;
}

export async function listActivities({ customerId, userId, sinceDays }: ListActivitiesFilters = {}) {
  const since = sinceDays ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000) : undefined;
  return prisma.activity.findMany({
    where: {
      ...(customerId ? { customerId } : {}),
      ...(userId ? { userId } : {}),
      ...(since ? { occurredAt: { gte: since } } : {}),
    },
    include: {
      customer: { select: { id: true, businessName: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 200, // feed cap; dashboard surfaces never need more than this
  });
}

export type ActivityTypeCounts = Record<ActivityType, number>;

export interface ActivityCountsByTypeResult {
  current: ActivityTypeCounts;
  previous: ActivityTypeCounts;
}

function emptyCounts(): ActivityTypeCounts {
  return Object.fromEntries(Object.values(ActivityType).map((t) => [t, 0])) as ActivityTypeCounts;
}

/**
 * Counts activities per type for [rangeStart, rangeEnd) plus the equal-length window
 * immediately before it, so callers can render this-vs-previous delta chips.
 */
export async function activityCountsByType(
  rangeStart: Date,
  rangeEnd: Date,
  userId?: string
): Promise<ActivityCountsByTypeResult> {
  const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
  const previousStart = new Date(rangeStart.getTime() - rangeMs);
  const userScope = userId ? { userId } : {};

  const [currentGroups, previousGroups] = await Promise.all([
    prisma.activity.groupBy({
      by: ["type"],
      where: { ...userScope, occurredAt: { gte: rangeStart, lt: rangeEnd } },
      _count: { _all: true },
    }),
    prisma.activity.groupBy({
      by: ["type"],
      where: { ...userScope, occurredAt: { gte: previousStart, lt: rangeStart } },
      _count: { _all: true },
    }),
  ]);

  const current = emptyCounts();
  for (const g of currentGroups) current[g.type] = g._count._all;
  const previous = emptyCounts();
  for (const g of previousGroups) previous[g.type] = g._count._all;

  return { current, previous };
}
