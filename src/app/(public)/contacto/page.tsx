import type { Metadata } from "next";
import { PageIntro } from "@/components/public/shared";
import { PublicContactForm } from "@/components/public/contact-form";
import { getPublicTeam } from "@/server/services/public-content-service";
import { getPublicSiteSettings } from "@/server/services/site-settings-service";
import { formatPhone } from "@/data/lawyers";
export const metadata: Metadata = {
  title: "Contacto",
  alternates: { canonical: "/contacto" },
};
export default async function Contact() {
  const [team, settings] = await Promise.all([
    getPublicTeam(),
    getPublicSiteSettings(),
  ]);
  return (
    <>
      <PageIntro
        eyebrow="Contacto"
        title="El primer paso es conversar."
        description="Cuéntenos qué necesita resolver. Revisaremos su solicitud para orientar el siguiente paso."
      />
      <section className="li-container page-content contact-layout">
        <div>
          {settings.contactEnabled ? (
            <PublicContactForm />
          ) : (
            <p>
              Puede comunicarse directamente con nuestros socios por correo o
              WhatsApp.
            </p>
          )}
        </div>
        <aside className="contact-people">
          <p className="li-label" style={{ marginBottom: 25 }}>
            Atención directa
          </p>
          {team.map((l) => (
            <div className="contact-person" key={l.slug}>
              <p className="li-label">{l.role}</p>
              <h3>{l.name}</h3>
              <a href={"mailto:" + l.email}>{l.email}</a>
              <a href={"tel:+52" + l.phone}>+52 {formatPhone(l.phone)}</a>
              <a href={"https://wa.me/" + l.whatsapp}>
                Conversar por WhatsApp ↗
              </a>
            </div>
          ))}
          {settings.address && <p>{settings.address}</p>}
        </aside>
      </section>
    </>
  );
}
