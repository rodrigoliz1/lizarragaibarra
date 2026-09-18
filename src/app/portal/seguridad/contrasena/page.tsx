import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PasswordChangeForm } from "@/components/portal/password-change-form";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.active) {
    redirect(
      "/portal/iniciar-sesion?callbackUrl=%2Fportal%2Fseguridad%2Fcontrasena",
    );
  }
  return (
    <main className="min-h-screen bg-[#080808] px-5 py-20 text-white sm:px-8">
      <section className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-[#0e0e0e] p-7 sm:p-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d3d3d0]">
          Seguridad de la cuenta
        </p>
        <h1 className="mt-4 font-serif text-5xl">Cambiar contraseña</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">
          Al guardar el cambio se cerrarán todas las sesiones abiertas, incluida
          esta.
        </p>
        <PasswordChangeForm />
      </section>
    </main>
  );
}
