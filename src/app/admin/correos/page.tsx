import { EmailDeliveryStatus } from "@prisma/client";
import { DatabaseZap, MailCheck, MailWarning } from "lucide-react";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

import { retryEmailAction } from "./actions";
import { RetryEmailButton } from "./retry-email-button";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

async function loadFailedEmails() {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    return await db.emailOutbox.findMany({
      where: {
        status: {
          in: [EmailDeliveryStatus.FAILED, EmailDeliveryStatus.DEAD_LETTER],
        },
      },
      select: {
        id: true,
        recipient: true,
        subject: true,
        template: true,
        attempts: true,
        status: true,
        lastError: true,
        lastAttemptAt: true,
        nextAttemptAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch {
    return null;
  }
}

export default async function FailedEmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [emails, params] = await Promise.all([
    loadFailedEmails(),
    searchParams,
  ]);

  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Correo transaccional"
        title="Entregas fallidas"
        description="Revisión y reintento controlado de mensajes que no fueron aceptados por el proveedor. El contenido del correo no se muestra en esta vista."
      />

      {params.notice === "queued" ? (
        <p
          className="rounded-xl border border-emerald-700/15 bg-emerald-700/[0.07] px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          El correo se reencoló de forma segura y la operación quedó auditada.
        </p>
      ) : null}
      {params.error ? (
        <p
          className="rounded-xl border border-red-700/15 bg-red-700/[0.06] px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          No fue posible reintentar el correo. Verifique la configuración y el
          estado actual del registro.
        </p>
      ) : null}

      {emails === null ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <DatabaseZap
            className="mx-auto size-8 text-black/35"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-serif text-2xl">Datos no disponibles</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            Configure Neon y aplique las migraciones para consultar la bandeja
            transaccional.
          </p>
        </section>
      ) : emails.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <MailCheck
            className="mx-auto size-8 text-emerald-700/60"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-serif text-2xl">Sin entregas fallidas</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            No existen correos pendientes de intervención administrativa.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="divide-y divide-black/10">
            {emails.map((email) => (
              <article
                className="grid gap-4 px-5 py-5 md:grid-cols-[1.4fr_1fr_auto] md:items-center md:px-6"
                key={email.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <MailWarning
                      className="size-4 text-amber-700"
                      aria-hidden="true"
                    />
                    <AdminStatus
                      tone={
                        email.status === EmailDeliveryStatus.DEAD_LETTER
                          ? "neutral"
                          : "gold"
                      }
                    >
                      {email.status === EmailDeliveryStatus.DEAD_LETTER
                        ? "Intentos agotados"
                        : "Reintento pendiente"}
                    </AdminStatus>
                    <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-black/35">
                      {email.template}
                    </span>
                  </div>
                  <h2 className="mt-3 truncate text-sm font-semibold">
                    {email.subject}
                  </h2>
                  <p className="mt-1 truncate text-xs text-black/45">
                    {email.recipient}
                  </p>
                </div>
                <div className="text-xs leading-5 text-black/45">
                  <p>Intentos: {email.attempts}</p>
                  <p>
                    {dateFormatter.format(
                      email.lastAttemptAt ?? email.createdAt,
                    )}
                  </p>
                  {email.lastError ? (
                    <p className="mt-1 text-black/35">{email.lastError}</p>
                  ) : null}
                  {email.nextAttemptAt ? (
                    <p className="mt-1 text-black/35">
                      Próximo intento:{" "}
                      {dateFormatter.format(email.nextAttemptAt)}
                    </p>
                  ) : null}
                </div>
                <RetryEmailButton
                  action={retryEmailAction}
                  outboxId={email.id}
                />
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
