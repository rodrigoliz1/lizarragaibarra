import type { CaseStudy } from "@prisma/client";
import { saveCase } from "@/app/admin/casos/actions";
import { SubmitButton } from "@/components/public/submit-button";
import { practiceAreas } from "@/data/practice-areas";
export function CaseEditor({
  initial,
  media,
}: {
  initial?: CaseStudy;
  media: { id: string; altText: string }[];
}) {
  return (
    <form className="li-form admin-editor" action={saveCase}>
      <input hidden name="id" defaultValue={initial?.id || ""} />
      <div className="field-pair">
        <label>
          Título
          <input
            name="title"
            required
            minLength={3}
            maxLength={180}
            defaultValue={initial?.title}
          />
        </label>
        <label>
          URL del caso
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={initial?.slug}
            placeholder="nombre-del-caso"
          />
        </label>
      </div>
      <label>
        Subtítulo
        <input
          name="subtitle"
          defaultValue={initial?.subtitle}
          maxLength={240}
        />
      </label>
      <div className="field-pair">
        <label>
          Área de práctica
          <select name="practiceArea" defaultValue={initial?.practiceArea}>
            {practiceAreas.map((a) => (
              <option key={a.slug} value={a.title}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Portada
          <select
            name="coverImageId"
            defaultValue={initial?.coverImageId || ""}
          >
            <option value="">Sin portada</option>
            {media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.altText}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Resumen
        <textarea
          name="summary"
          required
          minLength={20}
          maxLength={600}
          defaultValue={initial?.summary}
        />
      </label>
      {(["context", "challenge", "strategy", "result"] as const).map(
        (key, i) => (
          <label key={key}>
            {["Contexto", "Reto", "Estrategia", "Resultado"][i]}
            <textarea
              name={key}
              required
              minLength={10}
              maxLength={12000}
              defaultValue={initial?.[key]}
            />
          </label>
        ),
      )}
      <div className="field-pair">
        <label>
          Estado
          <select name="status" defaultValue={initial?.status || "DRAFT"}>
            <option value="DRAFT">Borrador</option>
            <option value="PENDING_REVIEW">Pendiente de revisión</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="ARCHIVED">Archivado</option>
          </select>
        </label>
        <label>
          Visibilidad
          <select
            name="visibility"
            defaultValue={initial?.visibility || "INTERNAL"}
          >
            <option value="INTERNAL">Sólo interno</option>
            <option value="ANONYMIZED">Público anonimizado</option>
            <option value="PUBLIC">Público</option>
          </select>
        </label>
      </div>
      <label className="check">
        <input
          name="featured"
          type="checkbox"
          defaultChecked={initial?.featured}
        />
        Destacar en el sitio
      </label>
      <div className="editor-notice">
        Verifique que este contenido no revele información confidencial, datos
        personales o información protegida por secreto profesional.
      </div>
      <label className="check">
        <input name="reviewed" type="checkbox" />
        Confirmo que este contenido ha sido revisado para proteger
        confidencialidad, datos personales y secreto profesional.
      </label>
      <details>
        <summary>Presentación en buscadores</summary>
        <label>
          Título SEO
          <input
            name="seoTitle"
            maxLength={70}
            defaultValue={initial?.seoTitle}
          />
        </label>
        <label>
          Descripción SEO
          <input
            name="seoDescription"
            maxLength={170}
            defaultValue={initial?.seoDescription}
          />
        </label>
      </details>
      <SubmitButton>Guardar caso</SubmitButton>
    </form>
  );
}
