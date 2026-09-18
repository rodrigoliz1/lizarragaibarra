import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
import { getPublicSiteSettings } from "@/server/services/site-settings-service";
import { AdminHeading } from "@/components/admin/admin-primitives";
import { SubmitButton } from "@/components/public/submit-button";
const schema = z.object({
  firmName: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(200),
  domain: z
    .string()
    .url()
    .refine((s) => s.startsWith("https://")),
  phoneDisplay: z.string().trim().max(40),
  phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  whatsappNumber: z.string().regex(/^[1-9]\d{7,14}$/),
  whatsappMessage: z.string().trim().min(10).max(500),
  contactEmail: z.string().email(),
  address: z.string().trim().max(400),
  officeHours: z.string().trim().max(160),
  timezone: z.string().refine((t) => {
    try {
      Intl.DateTimeFormat("es-MX", { timeZone: t });
      return true;
    } catch {
      return false;
    }
  }),
  privacyNotice: z.string().max(30000),
  termsContent: z.string().max(30000),
  legalContentStatus: z.enum(["PENDING_REAL_CONTENT", "APPROVED"]),
  bookingEnabled: z.boolean(),
  contactEnabled: z.boolean(),
  socialLinks: z.string().max(2000),
});
async function save(form: FormData) {
  "use server";
  const actor = await requireAdmin();
  const parsed = schema.safeParse({
    ...Object.fromEntries(form),
    bookingEnabled: form.get("bookingEnabled") === "on",
    contactEnabled: form.get("contactEnabled") === "on",
  });
  if (!parsed.success) redirect("/admin/configuracion?error=1");
  try {
    const { socialLinks, ...data } = parsed.data;
    const entries = socialLinks
      .split("\n")
      .filter((s) => s.trim())
      .map((s) => {
        const i = s.indexOf("=");
        if (i < 1) throw new Error();
        const url = new URL(s.slice(i + 1).trim());
        if (url.protocol !== "https:") throw new Error();
        return [s.slice(0, i).trim(), url.href];
      });
    if (
      data.legalContentStatus === "APPROVED" &&
      (!data.legalName ||
        !data.address ||
        data.privacyNotice.length < 100 ||
        data.termsContent.length < 100)
    )
      throw new Error();
    await db.$transaction(async (tx) => {
      await tx.siteSettings.update({
        where: { id: "default" },
        data: {
          ...data,
          socialLinks: Object.fromEntries(entries),
          updatedById: actor.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "SITE_SETTINGS_UPDATED",
          entityType: "SiteSettings",
          entityId: "default",
        },
      });
    });
  } catch {
    redirect("/admin/configuracion?error=1");
  }
  revalidatePath("/", "layout");
  redirect("/admin/configuracion?guardado=1");
}
export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string; error?: string }>;
}) {
  await requireAdmin();
  const s = await getPublicSiteSettings();
  const flags = await searchParams;
  return (
    <>
      <AdminHeading
        eyebrow="Administración"
        title="Configuración de la firma"
        description="Datos públicos, disponibilidad de formularios y contenido legal."
      />
      {flags.guardado && (
        <p role="status" className="form-status">
          Configuración guardada.
        </p>
      )}
      {flags.error && (
        <p role="alert" className="form-status error">
          Revise los campos. Para aprobar el contenido legal se requieren razón
          social, domicilio y textos completos.
        </p>
      )}
      <form className="li-form admin-editor" action={save}>
        <div className="field-pair">
          <label>
            Nombre de la firma
            <input name="firmName" required defaultValue={s.firmName} />
          </label>
          <label>
            Nombre legal del responsable
            <input name="legalName" defaultValue={s.legalName} />
          </label>
        </div>
        <label>
          Dominio canónico HTTPS
          <input name="domain" type="url" required defaultValue={s.domain} />
        </label>
        <div className="field-pair">
          <label>
            Teléfono visible
            <input name="phoneDisplay" defaultValue={s.phoneDisplay} />
          </label>
          <label>
            Teléfono internacional
            <input name="phoneE164" required defaultValue={s.phoneE164} />
          </label>
        </div>
        <div className="field-pair">
          <label>
            WhatsApp (código de país y número)
            <input
              name="whatsappNumber"
              required
              defaultValue={s.whatsappNumber}
            />
          </label>
          <label>
            Correo de contacto
            <input
              name="contactEmail"
              required
              type="email"
              defaultValue={s.contactEmail}
            />
          </label>
        </div>
        <label>
          Mensaje inicial de WhatsApp
          <textarea name="whatsappMessage" defaultValue={s.whatsappMessage} />
        </label>
        <label>
          Domicilio
          <input name="address" defaultValue={s.address} />
        </label>
        <div className="field-pair">
          <label>
            Horario de atención
            <input name="officeHours" defaultValue={s.officeHours} />
          </label>
          <label>
            Zona horaria
            <input name="timezone" defaultValue={s.timezone} />
          </label>
        </div>
        <label>
          Redes sociales (una por línea: Nombre=https://dirección)
          <textarea
            name="socialLinks"
            defaultValue={Object.entries(s.socialLinks)
              .map(([k, v]) => `${k}=${v}`)
              .join("\n")}
          />
        </label>
        <label className="check">
          <input
            name="bookingEnabled"
            type="checkbox"
            defaultChecked={s.bookingEnabled}
          />
          Habilitar agenda pública (requiere configurar disponibilidad)
        </label>
        <label className="check">
          <input
            name="contactEnabled"
            type="checkbox"
            defaultChecked={s.contactEnabled}
          />
          Habilitar formulario de contacto
        </label>
        <h2 className="admin-form-heading">Contenido legal</h2>
        <p className="editor-notice">
          {s.legalContentStatus === "APPROVED"
            ? "Contenido marcado como revisado."
            : "PENDING_REAL_CONTENT · Complete el domicilio, responsable y avisos aplicables antes de publicar el sitio."}
        </p>
        <label>
          Aviso de privacidad
          <textarea
            name="privacyNotice"
            rows={8}
            defaultValue={s.privacyNotice}
          />
        </label>
        <label>
          Términos de uso
          <textarea
            name="termsContent"
            rows={8}
            defaultValue={s.termsContent}
          />
        </label>
        <label>
          Revisión del contenido legal
          <select name="legalContentStatus" defaultValue={s.legalContentStatus}>
            <option value="PENDING_REAL_CONTENT">Pendiente de revisión</option>
            <option value="APPROVED">Revisado y aprobado por la firma</option>
          </select>
        </label>
        <SubmitButton>Guardar configuración</SubmitButton>
      </form>
    </>
  );
}
