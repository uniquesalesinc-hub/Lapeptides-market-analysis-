import { prisma } from "@/lib/prisma";
import type { TaskPriority, TaskSource, TaskStatus } from "@prisma/client";

export interface CreateTaskInput {
  title: string;
  note?: string | null;
  customerId?: string | null;
  assigneeId: string;
  creatorId: string;
  dueDate: Date;
  priority?: TaskPriority;
  source?: TaskSource;
}

export async function createTask(input: CreateTaskInput) {
  return prisma.task.create({
    data: {
      title: input.title,
      note: input.note || null,
      customerId: input.customerId || null,
      assigneeId: input.assigneeId,
      creatorId: input.creatorId,
      dueDate: input.dueDate,
      priority: input.priority ?? "MEDIUM",
      source: input.source ?? "MANUAL",
    },
  });
}

export async function completeTask(taskId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: { status: "DONE", completedAt: new Date() },
  });
}

export async function cancelTask(taskId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: { status: "CANCELLED" },
  });
}

export interface ListTasksFilters {
  assigneeId?: string;
  status?: TaskStatus;
}

export async function listTasks({ assigneeId, status }: ListTasksFilters = {}) {
  return prisma.task.findMany({
    where: {
      ...(assigneeId ? { assigneeId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      customer: { select: { id: true, businessName: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
}

export interface TaskCounts {
  open: number;
  overdue: number;
  doneThisMonth: number;
}

/** Open/overdue/done-this-month counts for the dashboard Tasks tab. Overdue = OPEN and past due. */
export async function taskCounts(assigneeId?: string): Promise<TaskCounts> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const scope = assigneeId ? { assigneeId } : {};

  const [open, overdue, doneThisMonth] = await Promise.all([
    prisma.task.count({ where: { ...scope, status: "OPEN" } }),
    prisma.task.count({ where: { ...scope, status: "OPEN", dueDate: { lt: now } } }),
    prisma.task.count({ where: { ...scope, status: "DONE", completedAt: { gte: monthStart } } }),
  ]);

  return { open, overdue, doneThisMonth };
}
