import { UserRoundCheck } from "lucide-react";
import type { Metadata } from "next";

import { ActivationForm } from "@/components/portal/activation-form";

export const metadata: Metadata = {
  title: "Activar cuenta",
  robots: { index: false, follow: false },
};

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <section className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#0e0e0e]/90 px-6 py-9 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur sm:px-12 sm:py-12">
      <div className="grid size-12 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-paper-muted">
        <UserRoundCheck aria-hidden="true" className="size-5" />
      </div>
      <p className="eyebrow mt-7 text-paper-quiet">Invitación individual</p>
      <h1 className="mt-3 font-serif text-4xl tracking-[-0.025em] sm:text-5xl">
        Activa tu cuenta
      </h1>
      <p className="mt-4 text-sm leading-6 text-white/50">
        Define una contraseña que sólo tú conocerás. La invitación se utiliza
        una sola vez.
      </p>
      <ActivationForm token={token} />
    </section>
  );
}
