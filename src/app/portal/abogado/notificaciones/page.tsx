import { NotificationList } from "@/components/portal/notification-list";
import { SectionHeading } from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";
import { markNotificationsReadAction } from "@/app/portal/notification-actions";

export default async function LawyerNotificationsPage() {
  const actor = await requireActor(["LAWYER"]);
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
        description="Novedades operativas de asuntos, citas y flujo editorial."
      />
      <NotificationList
        notifications={notifications}
        markReadAction={markNotificationsReadAction}
      />
    </div>
  );
}
