import {
  Building2,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { SectionHeading } from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

const profileSchema = z.object({
  phone: z.string().trim().min(8).max(24),
  company: z.string().trim().max(120),
});

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, actor, params] = await Promise.all([
    auth(),
    requireActor(["CLIENT"]),
    searchParams,
  ]);
  const profile = actor.clientProfileId
    ? await db.clientProfile.findUnique({
        where: { id: actor.clientProfileId },
        select: { phone: true, company: true },
      })
    : null;
  const name = session?.user?.name ?? "Cliente LI";
  const email = session?.user?.email ?? "";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function updateProfile(formData: FormData) {
    "use server";
    const current = await requireActor(["CLIENT"]);
    if (!current.clientProfileId) redirect("/portal/panel/perfil?error=perfil");
    const parsed = profileSchema.safeParse({
      phone: formData.get("phone"),
      company: formData.get("company"),
    });
    if (!parsed.success) redirect("/portal/panel/perfil?error=datos");
    await db.$transaction([
      db.clientProfile.update({
        where: { id: current.clientProfileId },
        data: parsed.data,
      }),
      db.auditLog.create({
        data: {
          actorId: current.id,
          action: "CLIENT_PROFILE_UPDATED",
          entityType: "ClientProfile",
          entityId: current.clientProfileId,
        },
      }),
    ]);
    revalidatePath("/portal/panel/perfil");
    redirect("/portal/panel/perfil?actualizado=1");
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Cuenta"
        title="Mi perfil"
        description="Información básica asociada con su acceso privado."
      />
      {params.actualizado === "1" ? (
        <p
          className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-xs text-emerald-100"
          role="status"
        >
          Datos actualizados correctamente.
        </p>
      ) : null}
      {params.error ? (
        <p
          className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-xs text-red-100"
          role="alert"
        >
          Revisa los datos ingresados.
        </p>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.75fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <span className="grid size-14 place-items-center rounded-full border border-paper-muted/35 bg-paper-muted/10 font-serif text-xl text-paper">
              {initials}
            </span>
            <div>
              <h2 className="font-serif text-3xl">{name}</h2>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                Cuenta cliente
              </p>
            </div>
          </div>
          <dl className="mt-2 divide-y divide-white/10">
            <div className="grid gap-3 py-5 sm:grid-cols-[180px_1fr]">
              <dt className="flex items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-white/30">
                <UserRound aria-hidden="true" className="size-3.5" />
                Nombre
              </dt>
              <dd className="text-sm text-white/65">{name}</dd>
            </div>
            <div className="grid gap-3 py-5 sm:grid-cols-[180px_1fr]">
              <dt className="flex items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-white/30">
                <Mail aria-hidden="true" className="size-3.5" />
                Correo
              </dt>
              <dd className="text-sm text-white/65">{email}</dd>
            </div>
          </dl>
          <form
            action={updateProfile}
            className="mt-5 grid gap-5 sm:grid-cols-2"
          >
            <label>
              <span className="field-label">Teléfono</span>
              <span className="relative block">
                <Phone
                  aria-hidden="true"
                  className="absolute left-4 top-4 size-4 text-white/30"
                />
                <input
                  className="field pl-11"
                  defaultValue={profile?.phone ?? ""}
                  name="phone"
                  required
                />
              </span>
            </label>
            <label>
              <span className="field-label">Empresa</span>
              <span className="relative block">
                <Building2
                  aria-hidden="true"
                  className="absolute left-4 top-4 size-4 text-white/30"
                />
                <input
                  className="field pl-11"
                  defaultValue={profile?.company ?? ""}
                  name="company"
                />
              </span>
            </label>
            <button
              className="button-light sm:col-span-2 sm:w-fit"
              type="submit"
            >
              Guardar cambios
            </button>
          </form>
        </section>
        <div className="space-y-5">
          <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <span className="grid size-10 place-items-center rounded-full border border-white/10 text-paper-muted">
              <ShieldCheck aria-hidden="true" className="size-4" />
            </span>
            <h2 className="mt-6 font-serif text-2xl">Seguridad de la cuenta</h2>
            <p className="mt-3 text-xs leading-5 text-white/40">
              El acceso se valida en el servidor y los cambios de contraseña
              invalidan sesiones anteriores.
            </p>
            <Link
              className="mt-5 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-paper-muted hover:text-white"
              href="/portal/recuperar"
            >
              <KeyRound aria-hidden="true" className="size-3.5" /> Cambiar
              contraseña
            </Link>
          </article>
          <article className="rounded-2xl border border-paper-muted/20 bg-paper-muted/[0.07] p-6">
            <p className="eyebrow text-paper-muted">Ayuda</p>
            <p className="mt-3 text-sm leading-6 text-white/50">
              Para cambios de identidad o acceso, contacta al equipo
              responsable.
            </p>
            <Link
              className="mt-5 inline-flex text-[10px] font-semibold uppercase tracking-[0.15em] text-paper hover:text-white"
              href="/contacto"
            >
              Contactar a LIZÁRRAGA & IBARRA ABOGADOS
            </Link>
          </article>
        </div>
      </div>
    </div>
  );
}
