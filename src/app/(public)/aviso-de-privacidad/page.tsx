import type { Metadata } from "next";
import { PageIntro } from "@/components/public/shared";
import { getPublicSiteSettings } from "@/server/services/site-settings-service";
import { SafeMarkdown } from "@/components/articles/safe-markdown";
export const metadata: Metadata = {
  title: "Privacidad",
  alternates: { canonical: "/aviso-de-privacidad" },
};
export default async function Privacy() {
  const s = await getPublicSiteSettings();
  return (
    <>
      <PageIntro eyebrow="Información del sitio" title="Privacidad." />
      <section className="li-container page-content">
        <div className="prose-li">
          {s.privacyNotice ? (
            <SafeMarkdown>{s.privacyNotice}</SafeMarkdown>
          ) : (
            <>
              <h2>Contacto y consultas</h2>
              <p>
                Los datos que usted proporciona mediante el formulario de
                contacto se utilizan para registrar su solicitud, comunicarnos
                con usted y valorar la atención de su asunto. El envío de una
                consulta no establece por sí mismo una relación de servicios
                profesionales.
              </p>
              <p>
                El portal utiliza cookies de sesión necesarias para autenticar
                el acceso. Este sitio no incorpora herramientas publicitarias de
                seguimiento.
              </p>
              <h2>Consultas sobre sus datos</h2>
              <p>
                Para solicitar información sobre el tratamiento de sus datos,
                comuníquese a{" "}
                <a href={"mailto:" + s.contactEmail}>{s.contactEmail}</a>. Antes
                de compartir información sensible o documentación de su asunto,
                solicite al equipo el aviso de privacidad integral aplicable a
                la relación profesional.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
