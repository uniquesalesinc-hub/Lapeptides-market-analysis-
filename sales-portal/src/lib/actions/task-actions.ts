"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { cancelTask, completeTask, createTask } from "@/lib/data/tasks";
import { createTaskSchema } from "@/lib/validation/crm";

export interface TaskActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function revalidateTaskViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
}

export async function createTaskAction(input: unknown): Promise<TaskActionResult> {
  const user = await requireUser();

  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid task." };
  }

  // Assignee defaults to the acting user; only admins may assign tasks to someone else.
  const assigneeId = parsed.data.assigneeId || user.id;
  if (assigneeId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "Only admins can assign tasks to other users." };
  }

  try {
    const task = await createTask({
      title: parsed.data.title,
      note: parsed.data.note,
      customerId: parsed.data.customerId,
      assigneeId,
      creatorId: user.id,
      dueDate: parsed.data.dueDate,
      priority: parsed.data.priority,
      source: parsed.data.source,
    });

    revalidateTaskViews();
    if (parsed.data.customerId) revalidatePath(`/customers/${parsed.data.customerId}`);
    return { ok: true, id: task.id };
  } catch (err) {
    console.error("[task:create-failed]", err);
    return { ok: false, error: "Could not create the task. Please try again." };
  }
}

export async function completeTaskAction(taskId: string): Promise<TaskActionResult> {
  await requireUser();
  if (!taskId) return { ok: false, error: "Missing task id." };

  try {
    const task = await completeTask(taskId);
    revalidateTaskViews();
    return { ok: true, id: task.id };
  } catch (err) {
    console.error("[task:complete-failed]", err);
    return { ok: false, error: "Could not complete the task. Please try again." };
  }
}

export async function cancelTaskAction(taskId: string): Promise<TaskActionResult> {
  await requireUser();
  if (!taskId) return { ok: false, error: "Missing task id." };

  try {
    const task = await cancelTask(taskId);
    revalidateTaskViews();
    return { ok: true, id: task.id };
  } catch (err) {
    console.error("[task:cancel-failed]", err);
    return { ok: false, error: "Could not cancel the task. Please try again." };
  }
}
