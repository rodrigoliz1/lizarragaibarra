import type { Metadata } from "next";
import { PageIntro } from "@/components/public/shared";
import { getPublicSiteSettings } from "@/server/services/site-settings-service";
import { SafeMarkdown } from "@/components/articles/safe-markdown";
export const metadata: Metadata = {
  title: "Términos de uso",
  alternates: { canonical: "/terminos" },
};
export default async function Terms() {
  const s = await getPublicSiteSettings();
  return (
    <>
      <PageIntro eyebrow="Información del sitio" title="Términos de uso." />
      <section className="li-container page-content">
        <div className="prose-li">
          {s.termsContent ? (
            <SafeMarkdown>{s.termsContent}</SafeMarkdown>
          ) : (
            <>
              <h2>Información general</h2>
              <p>
                El contenido de este sitio tiene fines informativos y no
                constituye asesoría jurídica individualizada. La procedencia de
                cualquier acción o defensa depende del análisis de los hechos,
                documentos y circunstancias del asunto.
              </p>
              <h2>Consultas y servicios</h2>
              <p>
                Las solicitudes de cita están sujetas a confirmación. La
                contratación de servicios requiere acordar por escrito su
                alcance, condiciones y honorarios.
              </p>
              <h2>Acceso al portal</h2>
              <p>
                El acceso está reservado a usuarios autorizados. Las
                credenciales son personales. Si advierte un acceso no
                reconocido, comuníquese con el equipo y revoque la sesión desde
                la sección de seguridad.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
