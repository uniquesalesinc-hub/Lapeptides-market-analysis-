"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/data/activities";
import { logActivitySchema } from "@/lib/validation/crm";

export interface CrmActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function logActivityAction(input: unknown): Promise<CrmActionResult> {
  const user = await requireUser();

  const parsed = logActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid activity." };
  }

  try {
    const activity = await logActivity({
      type: parsed.data.type,
      customerId: parsed.data.customerId,
      userId: user.id,
      note: parsed.data.note,
      occurredAt: parsed.data.occurredAt,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/engagement");
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { ok: true, id: activity.id };
  } catch (err) {
    console.error("[activity:log-failed]", err);
    return { ok: false, error: "Could not log the activity. Please try again." };
  }
}
