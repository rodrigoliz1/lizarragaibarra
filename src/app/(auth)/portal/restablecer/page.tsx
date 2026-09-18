import { KeyRound } from "lucide-react";

import { ResetPasswordForm } from "@/components/portal/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <section className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#0e0e0e]/90 px-6 py-9 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur sm:px-12 sm:py-12">
      <div className="grid size-12 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-paper-muted">
        <KeyRound aria-hidden="true" className="size-5" />
      </div>
      <p className="eyebrow mt-7 text-paper-quiet">Recuperación de acceso</p>
      <h1 className="mt-3 font-serif text-4xl tracking-[-0.025em] sm:text-5xl">
        Nueva contraseña
      </h1>
      <p className="mt-4 text-sm leading-6 text-white/50">
        La liga es de un solo uso y vence una hora después de su emisión.
      </p>
      <ResetPasswordForm token={token} />
    </section>
  );
}
