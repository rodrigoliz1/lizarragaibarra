"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ImagePlus, LayoutGrid, List } from "lucide-react";
export type MediaItem = {
  id: string;
  title: string;
  description: string;
  altText: string;
  collection: string;
  tags: string[];
  public: boolean;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  createdAt: string;
  usage: number;
  type: string;
  embedUrl: string | null;
};
export function MediaLibrary({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("");
  const [list, setList] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  async function upload(files: FileList | null) {
    if (!files || busy) return;
    setBusy(true);
    let count = 0;
    for (const file of Array.from(files)) {
      try {
        const form = new FormData();
        form.set("file", file);
        form.set("altText", file.name.replace(/\.[^.]+$/, ""));
        form.set("type", "ARTICLE_HERO");
        form.set("collection", collection || "General");
        const response = await fetch("/api/portal/media", {
          method: "POST",
          body: form,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        count++;
      } catch (e) {
        setMessage(
          e instanceof Error ? e.message : "No se pudo cargar la imagen.",
        );
        setBusy(false);
        router.refresh();
        return;
      }
    }
    setMessage(
      `${count} imágenes guardadas. Revise el texto alternativo antes de publicarlas.`,
    );
    setBusy(false);
    router.refresh();
  }
  function edit(item: MediaItem) {
    setSelected(item);
    dialog.current?.showModal();
  }
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const data = new FormData(e.currentTarget);
    const archive = data.get("archive") === "on";
    if (
      archive &&
      !window.confirm(
        "¿Archivar esta imagen? No podrá seleccionarse para nuevo contenido.",
      )
    )
      return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/media/" + selected.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.get("title"),
          description: data.get("description"),
          altText: data.get("altText"),
          collection: data.get("collection"),
          tags: String(data.get("tags") || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          public: data.get("public") === "on",
          archive,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setMessage(result.message);
      dialog.current?.close();
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  const filtered = items.filter(
    (i) =>
      (!collection || i.collection === collection) &&
      (i.title + " " + i.altText + " " + i.tags.join(" "))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="media-library">
      <div className="media-toolbar">
        <input
          placeholder="Buscar imágenes, nombres o etiquetas"
          aria-label="Buscar en la biblioteca"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Colección"
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
        >
          <option value="">Todas las colecciones</option>
          {[...new Set(items.map((i) => i.collection))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          aria-label={list ? "Mostrar cuadrícula" : "Mostrar lista"}
          onClick={() => setList(!list)}
        >
          {list ? <LayoutGrid size={20} /> : <List size={20} />}
        </button>
        <button
          className="li-button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus size={16} />
          {busy ? "Cargando…" : "Cargar imágenes"}
        </button>
        <input
          type="file"
          hidden
          ref={fileInput}
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <div
        className="media-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void upload(e.dataTransfer.files);
        }}
      >
        Arrastre sus imágenes aquí · JPG, PNG, WebP o AVIF · hasta 10 MB por
        archivo
      </div>
      {message && (
        <p className="form-status" role="status">
          {message}
        </p>
      )}
      <div className={list ? "media-list" : "media-grid"}>
        {filtered.map((i) => (
          <button className="media-card" onClick={() => edit(i)} key={i.id}>
            <div className="media-thumb">
              {i.embedUrl ? (
                <span>Video</span>
              ) : i.mimeType === "application/pdf" ? (
                <span>PDF</span>
              ) : (
                <Image
                  src={"/api/portal/media/" + i.id}
                  alt={i.altText}
                  fill
                  unoptimized
                  sizes="300px"
                />
              )}
            </div>
            <div>
              <strong>{i.title || i.altText}</strong>
              <span>
                {i.width} × {i.height} · {Math.ceil(i.size / 1024)} KB
              </span>
              <small>
                {i.collection} · {i.usage ? `${i.usage} usos` : "Sin utilizar"}
              </small>
            </div>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="admin-empty">
          Las imágenes que cargue estarán disponibles aquí y en los editores de
          contenido.
        </p>
      )}
      <dialog ref={dialog} className="media-dialog">
        <button
          className="dialog-close"
          onClick={() => dialog.current?.close()}
          aria-label="Cerrar"
        >
          ×
        </button>
        {selected && (
          <form className="li-form" key={selected.id} onSubmit={save}>
            <h2>Detalles del archivo</h2>
            <label>
              Título
              <input
                name="title"
                defaultValue={selected.title}
                maxLength={180}
              />
            </label>
            <label>
              Texto alternativo
              <input
                name="altText"
                defaultValue={selected.altText}
                required
                maxLength={300}
              />
            </label>
            <label>
              Descripción
              <textarea
                name="description"
                defaultValue={selected.description}
                maxLength={2000}
              />
            </label>
            <div className="field-pair">
              <label>
                Colección
                <input
                  name="collection"
                  defaultValue={selected.collection}
                  required
                  maxLength={80}
                />
              </label>
              <label>
                Etiquetas, separadas por coma
                <input name="tags" defaultValue={selected.tags.join(", ")} />
              </label>
            </div>
            <label className="check">
              <input
                name="public"
                type="checkbox"
                defaultChecked={selected.public}
              />
              Permitir acceso público directo. Confirmo que no contiene
              información confidencial.
            </label>
            <label className="check">
              <input
                name="archive"
                type="checkbox"
                disabled={selected.usage > 0}
              />
              Archivar archivo{" "}
              {selected.usage > 0 ? "(actualmente en uso)" : ""}
            </label>
            <p>
              {selected.usage} referencias ·{" "}
              {new Date(selected.createdAt).toLocaleDateString("es-MX")}
            </p>
            <div className="media-dialog-actions">
              <button className="li-button" disabled={busy}>
                Guardar cambios
              </button>
              <button
                type="button"
                className="li-button outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    location.origin + "/api/media/" + selected.id,
                  );
                  setMessage(
                    "URL copiada. Sólo funciona públicamente si el archivo está publicado o vinculado a contenido público.",
                  );
                }}
              >
                Copiar URL <ArrowUpRight size={15} />
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
