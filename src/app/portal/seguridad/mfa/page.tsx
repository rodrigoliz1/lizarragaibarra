import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MfaEnrollment } from "@/components/portal/mfa-enrollment";
import { MfaRecoveryManager } from "@/components/portal/mfa-recovery-manager";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.active) {
    redirect("/portal/iniciar-sesion?callbackUrl=%2Fportal%2Fseguridad%2Fmfa");
  }
  const user = await db.user.findFirst({
    where: { id: session.user.id, status: "ACTIVE" },
    select: { mfaEnabled: true, mfaEnrolledAt: true },
  });
  if (!user) redirect("/portal/iniciar-sesion");
  const destination =
    session.user.role === "ADMIN"
      ? "/admin"
      : session.user.role === "LAWYER"
        ? "/portal/abogado"
        : "/portal/panel";

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-20 text-white sm:px-8">
      <section className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-[#0e0e0e] p-7 shadow-2xl sm:p-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d3d3d0]">
          Seguridad de la cuenta
        </p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl">
          Verificación en dos pasos
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">
          Esta protección es opcional y recomendada. Al activarla, cada inicio
          de sesión requerirá el código de su aplicación autenticadora. LI
          Abogados nunca le solicitará estos códigos por correo o mensajería.
        </p>
        <div className="mt-10 border-t border-white/10 pt-8">
          {user.mfaEnabled ? (
            <div className="space-y-5">
              <p className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.06] p-5 text-sm text-emerald-50">
                MFA está activo
                {user.mfaEnrolledAt
                  ? ` desde ${new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(user.mfaEnrolledAt)}.`
                  : "."}
              </p>
              <Link
                href={destination}
                className="inline-flex rounded-full bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-black"
              >
                Continuar al portal
              </Link>
              <Link
                href="/portal/seguridad/sesiones"
                className="ml-3 inline-flex rounded-full border border-white/15 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70"
              >
                Revisar sesiones
              </Link>
              <MfaRecoveryManager />
            </div>
          ) : (
            <div className="space-y-6">
              <MfaEnrollment />
              <Link
                href={destination}
                className="inline-flex rounded-full border border-white/15 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/65"
              >
                Continuar sin activarla
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
