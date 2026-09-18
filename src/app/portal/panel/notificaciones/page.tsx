import { markNotificationsReadAction } from "@/app/portal/notification-actions";
import { NotificationList } from "@/components/portal/notification-list";
import { SectionHeading } from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

export default async function ClientNotificationsPage() {
  const actor = await requireActor(["CLIENT"]);
  const notifications = await db.notification.findMany({
    where: { recipientId: actor.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Centro de avisos"
        title="Notificaciones"
        description="Novedades prudentes de tus asuntos, mensajes y citas."
      />
      <NotificationList
        notifications={notifications}
        markReadAction={markNotificationsReadAction}
      />
    </div>
  );
}
