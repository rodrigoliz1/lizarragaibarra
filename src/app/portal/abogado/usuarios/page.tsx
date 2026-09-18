import { SectionHeading } from "@/components/portal/portal-primitives";
import { requirePartner } from "@/server/policies";

import { partnerCreateAccountAction } from "./actions";

export default async function PartnerAccountCreationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePartner();
  const params = await searchParams;
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Alta autorizada"
        title="Invitar cliente o asociado"
        description="El socio puede crear clientes y asociados; sólo ADMIN puede crear socios o administradores."
      />
      {params.creado === "1" ? (
        <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
          Cuenta creada e invitación registrada.
        </p>
      ) : null}
      <form
        action={partnerCreateAccountAction}
        className="mx-auto grid max-w-3xl gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:grid-cols-2"
      >
        <label className="text-xs text-white/45">
          Tipo
          <select
            name="kind"
            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-white"
          >
            <option value="client">Cliente</option>
            <option value="associate">Asociado</option>
          </select>
        </label>
        {[
          ["name", "Nombre", "text"],
          ["email", "Correo", "email"],
          ["phone", "Teléfono", "text"],
          ["company", "Empresa (cliente)", "text"],
          ["slug", "Slug (asociado)", "text"],
          ["position", "Puesto público (asociado)", "text"],
        ].map(([name, label, type]) => (
          <label className="text-xs text-white/45" key={name}>
            {label}
            <input
              name={name}
              type={type}
              required={name === "name" || name === "email"}
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white"
            />
          </label>
        ))}
        <button className="h-12 rounded-full bg-white text-[10px] font-bold uppercase tracking-[0.15em] text-black sm:col-span-2">
          Crear y enviar invitación
        </button>
      </form>
    </div>
  );
}
