import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { RecoveryForm } from "@/components/portal/recovery-form";

export default function RecoveryPage() {
  return (
    <section className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#0e0e0e]/90 px-6 py-9 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur sm:px-12 sm:py-12">
      <Link
        href="/portal/iniciar-sesion"
        className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-white"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Volver al acceso
      </Link>
      <div className="mt-9 grid size-12 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#d3d3d0]">
        <MailCheck size={19} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d3d3d0]">
        Recuperación de acceso
      </p>
      <h1 className="mt-3 font-serif text-4xl tracking-[-0.025em] sm:text-5xl">
        Restablecer contraseña
      </h1>
      <p className="mt-4 text-sm leading-6 text-white/50">
        Capture el correo registrado. Por seguridad, el equipo validará la
        solicitud antes de habilitar un nuevo acceso.
      </p>

      <RecoveryForm />
    </section>
  );
}
