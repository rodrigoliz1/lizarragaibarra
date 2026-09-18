import type { Metadata } from "next";
import { PageIntro } from "@/components/public/shared";
import { AppointmentWizard } from "@/components/appointments/appointment-wizard";
import { AppointmentManager } from "@/components/appointments/appointment-manager";
import {
  getPublicSiteSettings,
  getSettingsWhatsAppUrl,
} from "@/server/services/site-settings-service";
import { formatDateInTimeZone } from "@/lib/calendar/dates";
export const metadata: Metadata = {
  title: "Agendar consulta",
  alternates: { canonical: "/agendar" },
};
export default async function Booking({
  searchParams,
}: {
  searchParams: Promise<{ gestionar?: string }>;
}) {
  const [settings, params] = await Promise.all([
    getPublicSiteSettings(),
    searchParams,
  ]);
  return (
    <>
      <PageIntro
        eyebrow="Consulta inicial"
        title="Una conversación para avanzar."
        description="Seleccione el tipo de consulta y un horario disponible. La cita quedará sujeta a confirmación del equipo."
      />
      <section className="li-container page-content">
        {params.gestionar ? (
          <div className="booking-surface">
            <AppointmentManager
              baseDate={formatDateInTimeZone(new Date())}
              token={params.gestionar}
            />
          </div>
        ) : settings.bookingEnabled ? (
          <div className="booking-surface">
            <AppointmentWizard baseDate={formatDateInTimeZone(new Date())} />
          </div>
        ) : (
          <div className="booking-invitation">
            <p className="li-label">Atención personal</p>
            <h2>Coordinemos su consulta.</h2>
            <p>
              Contacte al equipo para encontrar un horario adecuado y conversar
              sobre su asunto.
            </p>
            <a className="li-button" href={getSettingsWhatsAppUrl(settings)}>
              Coordinar por WhatsApp ↗
            </a>
            <a
              className="li-text-link"
              href={"mailto:" + settings.contactEmail}
            >
              Escribir por correo ↗
            </a>
          </div>
        )}
      </section>
    </>
  );
}
