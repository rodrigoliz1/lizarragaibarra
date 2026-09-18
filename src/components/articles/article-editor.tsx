"use client";

import {
  CheckCircle2,
  GripVertical,
  Maximize2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Block = {
  id: string;
  type:
    | "HEADING_2"
    | "HEADING_3"
    | "PARAGRAPH"
    | "LIST"
    | "QUOTE"
    | "CALLOUT"
    | "NOTE"
    | "CONCLUSION";
  text: string;
};

const blockLabels: Record<Block["type"], string> = {
  HEADING_2: "Encabezado H2",
  HEADING_3: "Encabezado H3",
  PARAGRAPH: "Párrafo",
  LIST: "Lista (una línea por punto)",
  QUOTE: "Cita destacada",
  CALLOUT: "Llamada informativa",
  NOTE: "Nota",
  CONCLUSION: "Conclusión",
};

type ArticleEditorInitial = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  introduction?: string | null;
  practiceAreaId?: string | null;
  heroMediaId?: string | null;
  coauthorIds?: string[];
  blocks: Array<Omit<Block, "id">>;
};

export function ArticleEditor({
  practiceAreas,
  authors,
  initial,
  editBasePath = "/portal/abogado/articulos",
}: {
  practiceAreas: Array<{ id: string; name: string }>;
  authors: Array<{ id: string; name: string }>;
  initial?: ArticleEditorInitial;
  editBasePath?: string;
}) {
  const router = useRouter();
  const [articleId, setArticleId] = useState(initial?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [introduction, setIntroduction] = useState(initial?.introduction ?? "");
  const [practiceAreaId, setPracticeAreaId] = useState(
    initial?.practiceAreaId ?? "",
  );
  const [blocks, setBlocks] = useState<Block[]>(
    initial?.blocks.length
      ? initial.blocks.map((block) => ({
          ...block,
          id: crypto.randomUUID(),
        }))
      : [{ id: crypto.randomUUID(), type: "PARAGRAPH", text: "" }],
  );
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [heroMediaId, setHeroMediaId] = useState(initial?.heroMediaId ?? "");
  const [heroPreviewUrl, setHeroPreviewUrl] = useState(
    initial?.heroMediaId ? `/api/portal/media/${initial.heroMediaId}` : "",
  );
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [coauthorIds, setCoauthorIds] = useState(initial?.coauthorIds ?? []);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const heroAltRef = useRef<HTMLInputElement>(null);
  const heroCaptionRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(
    () => blocks.filter((block) => block.text.trim()),
    [blocks],
  );
  useEffect(() => {
    if (!previewExpanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewExpanded(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [previewExpanded]);
  function addBlock(type: Block["type"] = "PARAGRAPH") {
    setBlocks((current) => [
      ...current,
      { id: crypto.randomUUID(), type, text: "" },
    ]);
  }
  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, ...patch } : block,
      ),
    );
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setStatus("");
    const response = await fetch(
      articleId
        ? `/api/portal/articulos/${articleId}`
        : "/api/portal/articulos",
      {
        method: articleId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          introduction,
          practiceAreaId: practiceAreaId || undefined,
          heroMediaId: heroMediaId || undefined,
          coauthorIds,
          references: [],
          tags: [],
          blocks: blocks.map((block) =>
            block.type === "LIST"
              ? {
                  type: block.type,
                  items: block.text
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                }
              : { type: block.type, text: block.text },
          ),
        }),
      },
    ).catch(() => null);
    const payload = response
      ? ((await response.json()) as {
          message?: string;
          data?: { id: string };
          fieldErrors?: Record<string, string[]>;
        })
      : {};
    setPending(false);
    const firstFieldError = Object.values(payload.fieldErrors ?? {})
      .flat()
      .find(Boolean);
    setStatus(firstFieldError || payload.message || "No fue posible guardar.");
    if (response?.ok && payload.data?.id) {
      if (!articleId) {
        setArticleId(payload.data.id);
        window.history.replaceState(
          null,
          "",
          `${editBasePath}/${payload.data.id}/editar`,
        );
      }
      router.refresh();
    }
  }
  async function uploadHero() {
    const file = heroFileRef.current?.files?.[0];
    const altText = heroAltRef.current?.value.trim();
    if (!file || !altText) {
      setStatus("Selecciona una imagen e incluye su texto alternativo.");
      return;
    }
    setUploading(true);
    setStatus("");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("altText", altText);
    formData.set("caption", heroCaptionRef.current?.value.trim() || "");
    formData.set("type", "ARTICLE_HERO");
    const response = await fetch("/api/portal/media", {
      method: "POST",
      body: formData,
    }).catch(() => null);
    const payload = response
      ? ((await response.json()) as {
          message?: string;
          data?: { id: string; url?: string };
        })
      : {};
    setUploading(false);
    setStatus(payload.message || "No fue posible procesar la imagen.");
    if (response?.ok && payload.data?.id) {
      setHeroMediaId(payload.data.id);
      setHeroPreviewUrl(
        payload.data.url || `/api/portal/media/${payload.data.id}`,
      );
    }
  }
  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
        <label className="block text-xs text-white/45">
          Título
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slug)
                setSlug(
                  event.target.value
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, ""),
                );
            }}
            required
            maxLength={180}
            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white"
          />
        </label>
        <label className="block text-xs text-white/45">
          Slug
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white"
          />
        </label>
        <label className="block text-xs text-white/45">
          Área
          <select
            value={practiceAreaId}
            onChange={(event) => setPracticeAreaId(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-white"
          >
            <option value="">Sin área</option>
            {practiceAreas.map((area) => (
              <option value={area.id} key={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-white/45">
          Resumen
          <textarea
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            required
            minLength={20}
            maxLength={500}
            className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/30 p-4 text-white"
          />
        </label>
        <label className="block text-xs text-white/45">
          Introducción
          <textarea
            value={introduction}
            onChange={(event) => setIntroduction(event.target.value)}
            maxLength={5000}
            className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/30 p-4 text-white"
          />
        </label>
        <fieldset className="rounded-xl border border-white/10 p-4">
          <legend className="px-2 text-xs text-white/45">
            Imagen destacada
          </legend>
          <p className="text-xs leading-5 text-white/35">
            JPG, PNG, WebP o AVIF. Se corrige la orientación, se eliminan
            metadatos y se generan variantes WebP.
          </p>
          <div className="mt-3 grid gap-3">
            <input
              ref={heroFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setHeroPreviewUrl((current) => {
                  if (current.startsWith("blob:")) URL.revokeObjectURL(current);
                  return URL.createObjectURL(file);
                });
              }}
              className="text-xs text-white/50 file:mr-3 file:rounded-full file:border-0 file:px-3 file:py-2"
            />
            <input
              ref={heroAltRef}
              maxLength={300}
              placeholder="Texto alternativo descriptivo"
              className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white"
            />
            <input
              ref={heroCaptionRef}
              maxLength={500}
              placeholder="Pie de imagen opcional"
              className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white"
            />
            <button
              type="button"
              onClick={uploadHero}
              disabled={uploading}
              className="h-11 rounded-full border border-white/20 text-[9px] font-bold uppercase tracking-[0.14em] text-white"
            >
              {uploading
                ? "Optimizando…"
                : heroMediaId
                  ? "Sustituir imagen"
                  : "Subir imagen"}
            </button>
            {heroMediaId ? (
              <p className="flex items-center gap-2 text-xs text-emerald-200/70">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Imagen optimizada y almacenada; quedará asociada al guardar.
              </p>
            ) : null}
          </div>
        </fieldset>
        {authors.length ? (
          <fieldset className="rounded-xl border border-white/10 p-4">
            <legend className="px-2 text-xs text-white/45">Coautoría</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {authors.map((author) => (
                <label
                  className="flex items-center gap-2 text-xs text-white/50"
                  key={author.id}
                >
                  <input
                    type="checkbox"
                    checked={coauthorIds.includes(author.id)}
                    onChange={(event) =>
                      setCoauthorIds((current) =>
                        event.target.checked
                          ? [...current, author.id]
                          : current.filter((id) => id !== author.id),
                      )
                    }
                  />
                  {author.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className="rounded-xl border border-white/10 p-4"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="size-4 text-white/25" />
                <select
                  value={block.type}
                  onChange={(event) =>
                    updateBlock(block.id, {
                      type: event.target.value as Block["type"],
                    })
                  }
                  className="h-10 flex-1 rounded-lg bg-black px-3 text-xs text-white"
                >
                  {Object.entries(blockLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Eliminar bloque ${index + 1}`}
                  onClick={() =>
                    setBlocks((current) =>
                      current.filter((item) => item.id !== block.id),
                    )
                  }
                  className="grid size-9 place-items-center rounded-full border border-white/10 text-white/40"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <textarea
                value={block.text}
                onChange={(event) =>
                  updateBlock(block.id, { text: event.target.value })
                }
                placeholder={blockLabels[block.type]}
                className="mt-3 min-h-28 w-full rounded-lg bg-black/30 p-3 text-sm leading-6 text-white"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => addBlock()}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/60"
        >
          <Plus className="size-3" /> Añadir bloque
        </button>
        <button
          type="submit"
          disabled={pending || !blocks.length}
          className="block h-12 w-full rounded-full bg-white text-[10px] font-bold uppercase tracking-[0.16em] text-black"
        >
          {pending ? "Guardando…" : "Guardar borrador"}
        </button>
        {status ? <p className="text-xs text-white/45">{status}</p> : null}
      </section>
      <aside className="self-start overflow-hidden rounded-2xl border border-white/10 bg-[#f3f1ed] text-black xl:sticky xl:top-8">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">
            Vista previa
          </p>
          <button
            type="button"
            onClick={() => setPreviewExpanded(true)}
            className="inline-flex items-center gap-2 rounded-full border border-black/15 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em]"
          >
            <Maximize2 className="size-3.5" aria-hidden="true" /> Ampliar
          </button>
        </div>
        <div
          className="relative h-[min(68vh,46rem)] overflow-hidden p-7"
          data-testid="compact-article-preview"
        >
          <ArticlePreview
            blocks={preview}
            excerpt={excerpt}
            heroPreviewUrl={heroPreviewUrl}
            introduction={introduction}
            title={title}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f3f1ed] to-transparent" />
        </div>
      </aside>
      {previewExpanded ? (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 p-4 backdrop-blur sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa ampliada del artículo"
        >
          <div className="mx-auto min-h-full max-w-6xl bg-[#f3f1ed] text-black shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-[#f3f1ed]/95 px-6 py-4 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
                Vista previa a tamaño completo
              </p>
              <button
                type="button"
                onClick={() => setPreviewExpanded(false)}
                className="grid size-10 place-items-center rounded-full border border-black/15"
                aria-label="Cerrar vista previa"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <article className="mx-auto max-w-4xl px-6 py-12 sm:px-10 sm:py-20">
              <ArticlePreview
                blocks={preview}
                excerpt={excerpt}
                heroPreviewUrl={heroPreviewUrl}
                introduction={introduction}
                title={title}
              />
            </article>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function ArticlePreview({
  blocks,
  excerpt,
  heroPreviewUrl,
  introduction,
  title,
}: {
  blocks: Block[];
  excerpt: string;
  heroPreviewUrl: string;
  introduction: string;
  title: string;
}) {
  return (
    <>
      <h1 className="break-words font-serif text-4xl leading-tight sm:text-5xl">
        {title || "Título del artículo"}
      </h1>
      <p className="mt-4 break-words text-sm leading-6 text-black/50">
        {excerpt || "El resumen aparecerá aquí."}
      </p>
      {heroPreviewUrl ? (
        <div
          role="img"
          aria-label="Vista previa de la imagen destacada"
          className="mt-8 aspect-[16/7] w-full bg-black/10 bg-cover bg-center"
          style={{ backgroundImage: `url(${JSON.stringify(heroPreviewUrl)})` }}
        />
      ) : null}
      {introduction ? (
        <p className="mt-8 break-words font-serif text-2xl leading-snug">
          {introduction}
        </p>
      ) : null}
      <div className="mt-8 space-y-5">
        {blocks.map((block) =>
          block.type === "HEADING_2" ? (
            <h2 key={block.id} className="break-words font-serif text-3xl">
              {block.text}
            </h2>
          ) : block.type === "HEADING_3" ? (
            <h3 key={block.id} className="break-words font-serif text-2xl">
              {block.text}
            </h3>
          ) : block.type === "QUOTE" ? (
            <blockquote
              key={block.id}
              className="break-words border-l-2 border-black pl-4 font-serif text-xl"
            >
              {block.text}
            </blockquote>
          ) : block.type === "LIST" ? (
            <ul
              key={block.id}
              className="list-disc space-y-2 break-words pl-5 text-sm leading-6"
            >
              {block.text
                .split("\n")
                .filter(Boolean)
                .map((item, index) => (
                  <li key={`${block.id}-${index}`}>{item}</li>
                ))}
            </ul>
          ) : (
            <p
              key={block.id}
              className="whitespace-pre-wrap break-words text-sm leading-7 text-black/65"
            >
              {block.text}
            </p>
          ),
        )}
      </div>
    </>
  );
}
