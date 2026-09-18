"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

export async function markNotificationsReadAction(formData: FormData) {
  const actor = await requireActor();
  const notificationId = String(formData.get("notificationId") || "");
  await db.notification.updateMany({
    where: {
      recipientId: actor.id,
      readAt: null,
      ...(notificationId ? { id: notificationId } : {}),
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/portal/abogado/notificaciones");
  revalidatePath("/portal/panel/notificaciones");
}
