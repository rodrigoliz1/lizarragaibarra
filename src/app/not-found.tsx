import Link from "next/link";
import { Logo } from "@/components/layout/logo";
export default function NotFound() {
  return (
    <main className="li-not-found">
      <Logo />
      <p className="li-label">404 / Página no encontrada</p>
      <h1>
        Retomemos
        <br />
        el camino.
      </h1>
      <p>La página que busca no está disponible.</p>
      <Link className="li-button" href="/">
        Volver al inicio ↗
      </Link>
    </main>
  );
}
