import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function currentInternalSession() {
  const session = await auth();
  if (!session?.user?.id || !session.user.active) {
    return null;
  }
  return session;
}

async function revokeSession(formData: FormData) {
  "use server";
  const session = await currentInternalSession();
  if (!session) redirect("/portal/iniciar-sesion");
  const parsed = z.string().uuid().safeParse(formData.get("sessionId"));
  if (!parsed.success) return;
  const revoked = await db.userSession.updateMany({
    where: {
      id: parsed.data,
      userId: session.user.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
  if (revoked.count) {
    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "AUTH_SESSION_REVOKED",
        entityType: "UserSession",
        entityId: parsed.data,
      },
    });
  }
  if (parsed.data === session.user.sessionId) {
    await signOut({ redirectTo: "/portal/iniciar-sesion" });
  }
  revalidatePath("/portal/seguridad/sesiones");
}

async function revokeAllSessions() {
  "use server";
  const session = await currentInternalSession();
  if (!session) redirect("/portal/iniciar-sesion");
  await db.$transaction(async (transaction) => {
    await transaction.userSession.updateMany({
      where: { userId: session.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await transaction.user.update({
      where: { id: session.user.id },
      data: { sessionVersion: { increment: 1 } },
    });
    await transaction.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "AUTH_ALL_SESSIONS_REVOKED",
        entityType: "User",
        entityId: session.user.id,
      },
    });
  });
  await signOut({ redirectTo: "/portal/iniciar-sesion" });
}

export default async function SessionsPage() {
  const session = await currentInternalSession();
  if (!session) redirect("/portal/iniciar-sesion");
  const sessions = await db.userSession.findMany({
    where: {
      userId: session.user.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
      userAgent: true,
    },
  });
  const dateTime = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <main className="min-h-screen bg-[#080808] px-5 py-20 text-white sm:px-8">
      <section className="mx-auto max-w-4xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d3d3d0]">
          Seguridad de la cuenta
        </p>
        <h1 className="mt-4 font-serif text-5xl">Sesiones activas</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">
          Revise los dispositivos recientes y cierre cualquier acceso que no
          reconozca. Las sesiones vencen también por inactividad.
        </p>
        <div className="mt-10 divide-y divide-white/10 rounded-2xl border border-white/10">
          {sessions.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-white/75">
                  {item.id === session.user.sessionId
                    ? "Esta sesión"
                    : "Sesión autorizada"}
                </p>
                <p className="mt-2 max-w-2xl break-words text-xs leading-5 text-white/40">
                  {item.userAgent || "Dispositivo no identificado"}
                </p>
                <p className="mt-2 text-[10px] text-white/30">
                  Última actividad: {dateTime.format(item.lastSeenAt)} · Vence:{" "}
                  {dateTime.format(item.expiresAt)}
                </p>
              </div>
              <form action={revokeSession}>
                <input type="hidden" name="sessionId" value={item.id} />
                <button
                  type="submit"
                  className="rounded-full border border-white/15 px-5 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-white/65"
                >
                  Cerrar sesión
                </button>
              </form>
            </article>
          ))}
        </div>
        <form action={revokeAllSessions} className="mt-8">
          <button
            type="submit"
            className="rounded-full border border-red-200/25 bg-red-200/[0.05] px-6 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-red-100"
          >
            Cerrar todas las sesiones
          </button>
        </form>
      </section>
    </main>
  );
}
