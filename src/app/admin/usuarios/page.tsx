import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

import {
  changeUserStatusAction,
  createUserAction,
  resendInvitationAction,
  revokeInvitationAction,
} from "./actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [users, areas] = await Promise.all([
    db.user.findMany({
      include: { clientProfile: true, lawyerProfile: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.practiceArea.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Cuentas individuales"
        title="Usuarios"
        description="Invitación, activación y estado de administradores, profesionales y clientes. Nunca se generan contraseñas temporales."
      />
      {params.creado === "1" ? (
        <p className="rounded-xl border border-emerald-600/20 bg-emerald-50 p-4 text-sm text-emerald-900">
          La cuenta se creó y la invitación quedó registrada.
        </p>
      ) : null}
      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form
          action={createUserAction}
          className="self-start rounded-2xl border border-black/10 bg-white p-6"
        >
          <h2 className="font-serif text-3xl">Invitar cuenta</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-black/50">
              Rol
              <select
                name="role"
                className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3"
              >
                <option value="CLIENT">Cliente</option>
                <option value="LAWYER">Abogado</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>
            <label className="text-xs text-black/50">
              Rango profesional
              <select
                name="rank"
                className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3"
              >
                <option value="ASSOCIATE">Asociado</option>
                <option value="PARTNER">Socio</option>
              </select>
            </label>
            <label className="text-xs text-black/50 sm:col-span-2">
              Nombre
              <input
                name="name"
                required
                className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3"
              />
            </label>
            <label className="text-xs text-black/50">
              Correo
              <input
                name="email"
                type="email"
                required
                className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3"
              />
            </label>
            <label className="text-xs text-black/50">
              Teléfono
              <input
                name="phone"
                className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3"
              />
            </label>
            <label className="text-xs text-black/50">
              Empresa
              <input
                name="company"
                className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3"
              />
            </label>
            <label className="text-xs text-black/50">
              Puesto público
              <input
                name="position"
                className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3"
              />
            </label>
            <label className="text-xs text-black/50 sm:col-span-2">
              Slug de abogado
              <input
                name="slug"
                placeholder="nombre-apellido"
                className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3"
              />
            </label>
            <label className="text-xs text-black/50 sm:col-span-2">
              Biografía
              <textarea
                name="bio"
                maxLength={5000}
                className="mt-2 min-h-24 w-full rounded-lg border border-black/10 p-3"
              />
            </label>
            <label className="text-xs text-black/50 sm:col-span-2">
              Formación
              <textarea
                name="education"
                maxLength={2000}
                className="mt-2 min-h-20 w-full rounded-lg border border-black/10 p-3"
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-xs text-black/50">
                Áreas de práctica
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {areas.map((area) => (
                  <label
                    className="flex items-center gap-2 text-xs"
                    key={area.id}
                  >
                    <input
                      type="checkbox"
                      name="practiceAreaIds"
                      value={area.id}
                    />
                    {area.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="publicProfile" />
              Perfil público activo
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="sendInvite" defaultChecked />
              Enviar invitación
            </label>
            <button className="h-11 rounded-full bg-black text-[9px] font-bold uppercase tracking-[0.14em] text-white sm:col-span-2">
              Crear e invitar
            </button>
          </div>
        </form>
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="border-b border-black/10 p-6">
            <h2 className="font-serif text-3xl">Directorio de acceso</h2>
          </div>
          <div className="divide-y divide-black/10">
            {users.map((user) => (
              <article key={user.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="mt-1 text-xs text-black/40">{user.email}</p>
                    <p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-black/35">
                      {user.role}
                      {user.lawyerProfile
                        ? ` · ${user.lawyerProfile.rank}`
                        : ""}
                    </p>
                  </div>
                  <AdminStatus
                    tone={
                      user.status === "ACTIVE"
                        ? "green"
                        : user.status === "INVITED"
                          ? "gold"
                          : "neutral"
                    }
                  >
                    {user.status}
                  </AdminStatus>
                </div>
                <form
                  action={changeUserStatusAction}
                  className="mt-4 flex gap-2"
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <select
                    name="status"
                    defaultValue={
                      user.status === "INVITED" ? "ACTIVE" : user.status
                    }
                    className="h-9 rounded-lg border border-black/10 px-2 text-xs"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="SUSPENDED">Suspendido</option>
                    <option value="ARCHIVED">Archivado</option>
                  </select>
                  <button className="rounded-full border border-black/10 px-3 text-[9px] font-bold uppercase tracking-[0.12em]">
                    Aplicar
                  </button>
                </form>
                {user.status === "INVITED" ? (
                  <div className="mt-2 flex flex-wrap gap-4">
                    <form action={resendInvitationAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button className="text-[9px] font-bold uppercase tracking-[0.13em] text-black/45 hover:text-black">
                        Reemitir invitación segura
                      </button>
                    </form>
                    <form action={revokeInvitationAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button className="text-[9px] font-bold uppercase tracking-[0.13em] text-red-800/60 hover:text-red-900">
                        Revocar invitación
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
