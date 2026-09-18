import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { Bell } from "lucide-react";
import { safeInternalPath } from "@/lib/security/redirects";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationList({
  notifications,
  markReadAction,
}: {
  notifications: NotificationItem[];
  markReadAction: (formData: FormData) => Promise<void>;
}) {
  if (!notifications.length)
    return (
      <EmptyState
        icon={Bell}
        title="Sin notificaciones"
        description="Las novedades de tus asuntos, citas y publicaciones aparecerán aquí."
      />
    );
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="flex justify-end border-b border-white/10 p-4">
        <form action={markReadAction}>
          <button className="rounded-full border border-white/15 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/55">
            Marcar todas como leídas
          </button>
        </form>
      </div>
      <ul className="divide-y divide-white/10">
        {notifications.map((notification) => {
          const safeHref = safeInternalPath(notification.href ?? undefined, "");
          return (
            <li
              className={
                notification.readAt ? "p-5 opacity-60" : "bg-white/[0.025] p-5"
              }
              key={notification.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.16em] text-white/30">
                    {notification.createdAt.toLocaleString("es-MX", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "America/Mexico_City",
                    })}
                  </p>
                  <h2 className="mt-2 font-serif text-2xl">
                    {notification.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/45">
                    {notification.body}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {safeHref ? (
                    <Link
                      className="rounded-full border border-white/15 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/65"
                      href={safeHref}
                    >
                      Abrir
                    </Link>
                  ) : null}
                  {!notification.readAt ? (
                    <form action={markReadAction}>
                      <input
                        type="hidden"
                        name="notificationId"
                        value={notification.id}
                      />
                      <button className="rounded-full bg-white px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-black">
                        Leída
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
