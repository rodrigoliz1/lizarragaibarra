"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="li-not-found">
      <p className="li-label">Lizárraga & Ibarra</p>
      <h1>
        Intentemos
        <br />
        de nuevo.
      </h1>
      <p>
        No pudimos cargar esta información. Sus datos guardados permanecen en el
        sistema.
      </p>
      <button className="li-button" onClick={reset}>
        Volver a intentar
      </button>
      <a className="li-text-link" href="/contacto">
        Contactar al equipo
      </a>
    </main>
  );
}
