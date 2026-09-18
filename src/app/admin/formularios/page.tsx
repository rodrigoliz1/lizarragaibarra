import type { Prisma } from "@prisma/client";
import { ArrowUpRight, DatabaseZap, Inbox } from "lucide-react";
import Link from "next/link";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { appointmentAreas } from "@/components/appointments/options";
import { db } from "@/lib/db";

const submissionSelect = {
  id: true,
  reference: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  practiceArea: true,
  message: true,
  status: true,
  createdAt: true,
} satisfies Prisma.ContactSubmissionSelect;

type SubmissionRow = Prisma.ContactSubmissionGetPayload<{
  select: typeof submissionSelect;
}>;

type SubmissionsResult =
  | { kind: "ready"; submissions: SubmissionRow[] }
  | { kind: "unavailable"; message: string };

const statusPresentation = {
  CONTACTED: { label: "Contactado", tone: "blue" },
  QUALIFIED: { label: "Calificado", tone: "green" },
  CLOSED: { label: "Cerrado", tone: "neutral" },
  ARCHIVED: { label: "Archivado", tone: "neutral" },
  NEW: { label: "Nuevo", tone: "gold" },
  IN_REVIEW: { label: "En revisión", tone: "blue" },
  RESOLVED: { label: "Resuelto", tone: "green" },
  SPAM: { label: "Spam", tone: "neutral" },
} as const;

const areaLabels: ReadonlyMap<string, string> = new Map(
  appointmentAreas.map((area) => [area.value, area.label]),
);

const receivedAtFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

export const dynamic = "force-dynamic";

async function loadSubmissions(): Promise<SubmissionsResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      kind: "unavailable",
      message:
        "La base de datos no está configurada en este entorno. No se muestran solicitudes simuladas.",
    };
  }

  try {
    const submissions = await db.contactSubmission.findMany({
      select: submissionSelect,
      orderBy: [{ createdAt: "desc" }, { reference: "asc" }],
      take: 100,
    });
    return { kind: "ready", submissions };
  } catch {
    return {
      kind: "unavailable",
      message:
        "No fue posible consultar las solicitudes. Verifica la conexión y las migraciones.",
    };
  }
}

export default async function FormsAdminPage() {
  const result = await loadSubmissions();

  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Entradas"
        title="Formularios"
        description="Solicitudes reales recibidas desde el formulario público, en una vista administrativa de lectura."
        action={
          <Link
            href="/contacto"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-black/60 hover:border-black/20"
          >
            Ver formulario público <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        }
      />

      {result.kind === "unavailable" ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <DatabaseZap
            className="mx-auto size-8 text-black/35"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-serif text-2xl text-[#111]">
            Solicitudes no disponibles
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            {result.message}
          </p>
        </section>
      ) : result.submissions.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <Inbox className="mx-auto size-8 text-black/35" aria-hidden="true" />
          <h2 className="mt-5 font-serif text-2xl text-[#111]">
            Sin solicitudes recibidas
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            Los mensajes enviados desde contacto aparecerán aquí. No se utilizan
            registros de demostración.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="hidden grid-cols-[0.75fr_1.25fr_1fr_0.85fr_0.55fr] gap-4 border-b border-black/10 px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-black/35 md:grid">
            <span>Referencia</span>
            <span>Contacto</span>
            <span>Servicio</span>
            <span>Recibido</span>
            <span>Estado</span>
          </div>
          <div className="divide-y divide-black/10">
            {result.submissions.map((submission) => {
              const presentation = statusPresentation[submission.status];

              return (
                <article
                  key={submission.id}
                  className="grid gap-3 px-5 py-5 md:grid-cols-[0.75fr_1.25fr_1fr_0.85fr_0.55fr] md:items-start md:px-6"
                >
                  <p className="break-all text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b8b87]">
                    {submission.reference}
                  </p>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{submission.name}</p>
                    {submission.company ? (
                      <p className="mt-1 text-[10px] text-black/40">
                        {submission.company}
                      </p>
                    ) : null}
                    <a
                      className="mt-2 block truncate text-[10px] text-[#292929] hover:text-black"
                      href={`mailto:${submission.email}`}
                    >
                      {submission.email}
                    </a>
                    <a
                      className="mt-1 block text-[10px] text-black/45 hover:text-black"
                      href={`tel:${submission.phone.replace(/[^+\d]/g, "")}`}
                    >
                      {submission.phone}
                    </a>
                  </div>
                  <p className="text-xs leading-5 text-black/50">
                    {submission.practiceArea
                      ? (areaLabels.get(submission.practiceArea) ??
                        submission.practiceArea)
                      : "Sin área indicada"}
                  </p>
                  <p className="text-xs leading-5 text-black/40">
                    {receivedAtFormatter.format(submission.createdAt)}
                  </p>
                  <AdminStatus tone={presentation.tone}>
                    {presentation.label}
                  </AdminStatus>
                  <div className="rounded-xl bg-black/[0.025] p-4 md:col-span-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-black/30">
                      Mensaje
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-black/55">
                      {submission.message}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="rounded-xl border border-[#8b8b87]/20 bg-[#8b8b87]/[0.07] px-5 py-4 text-xs leading-5 text-[#292929]">
        Esta pantalla consulta el repositorio en modo lectura. No ofrece cambios
        de estado ni acciones que aparenten guardar información.
      </div>
    </div>
  );
}
