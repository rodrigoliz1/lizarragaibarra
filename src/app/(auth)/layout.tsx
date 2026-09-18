import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
export const metadata: Metadata = {
  title: "Portal privado",
  robots: { index: false, follow: false },
};
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <header>
        <Logo />
        <Link href="/">Volver a la firma ↗</Link>
      </header>
      <main id="contenido-auth">{children}</main>
      <footer>Lizárraga & Ibarra · Acceso privado</footer>
    </div>
  );
}
