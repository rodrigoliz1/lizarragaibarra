import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

export default async function LawyerProfilePage() {
  const actor = await requireActor(["LAWYER"]);
  const profile = await db.lawyerProfile.findUnique({
    where: { id: actor.lawyerProfileId! },
    include: {
      user: { select: { email: true, status: true, lastLoginAt: true } },
      areas: { include: { practiceArea: { select: { name: true } } } },
      supervisor: { select: { displayName: true } },
    },
  });
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Cuenta individual"
        title="Mi perfil"
        description="Información profesional vinculada a su acceso. Los cambios institucionales requieren autorización."
      />
      {profile ? (
        <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-2xl border border-white/10 p-6">
            <div className="grid aspect-square place-items-center rounded-2xl bg-white/[0.04] font-serif text-7xl">
              {profile.displayName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
            <h2 className="mt-6 font-serif text-3xl">{profile.displayName}</h2>
            <p className="mt-2 text-sm text-white/45">{profile.position}</p>
            <div className="mt-4">
              <StatusPill
                tone={profile.user?.status === "ACTIVE" ? "green" : "neutral"}
              >
                {profile.rank}
              </StatusPill>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 p-6">
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Correo
                </dt>
                <dd className="mt-2 text-sm text-white/65">
                  {profile.user?.email}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Supervisor
                </dt>
                <dd className="mt-2 text-sm text-white/65">
                  {profile.supervisor?.displayName || "No asignado"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Áreas
                </dt>
                <dd className="mt-2 text-sm text-white/65">
                  {profile.areas
                    .map((item) => item.practiceArea.name)
                    .join(", ") || "Sin áreas asignadas"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Biografía
                </dt>
                <dd className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/50">
                  {profile.bio || "Pendiente"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Formación
                </dt>
                <dd className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/50">
                  {profile.education || "Pendiente"}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}
    </div>
  );
}
