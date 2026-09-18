import { SectionHeading } from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

import {
  addOwnBlockedTime,
  saveOwnAvailability,
  saveOwnAvailabilityOverride,
} from "./actions";

const weekdays = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const time = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export default async function LawyerAvailabilityPage() {
  const actor = await requireActor(["LAWYER"]);
  if (!actor.lawyerProfileId)
    throw new Error("Perfil profesional no disponible.");
  const lawyerProfileId = actor.lawyerProfileId;
  const [rules, blocks, overrides] = await Promise.all([
    db.availabilityRule.findMany({
      where: { lawyerId: lawyerProfileId },
      orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }],
    }),
    db.blockedTime.findMany({
      where: { lawyerId: lawyerProfileId, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 30,
    }),
    db.lawyerAvailabilityOverride.findMany({
      where: { lawyerId: lawyerProfileId, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 30,
    }),
  ]);
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Agenda individual"
        title="Disponibilidad"
        description="Estas reglas sólo afectan a su perfil profesional y se descuentan de citas, propuestas y ausencias."
      />
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 p-6">
          <h2 className="font-serif text-3xl">Regla semanal</h2>
          <form
            action={saveOwnAvailability}
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            <label className="text-xs text-white/45">
              Día
              <select
                name="weekday"
                className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-white"
              >
                {weekdays.map((day, index) => (
                  <option value={index} key={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <span />
            <label className="text-xs text-white/45">
              Inicio
              <input
                name="start"
                type="time"
                defaultValue="09:00"
                required
                className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-white"
              />
            </label>
            <label className="text-xs text-white/45">
              Fin
              <input
                name="end"
                type="time"
                defaultValue="18:00"
                required
                className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-white"
              />
            </label>
            <label className="text-xs text-white/45">
              Duración
              <input
                name="duration"
                type="number"
                min="15"
                max="240"
                defaultValue="45"
                className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-white"
              />
            </label>
            <label className="text-xs text-white/45">
              Intervalo
              <input
                name="buffer"
                type="number"
                min="0"
                max="120"
                defaultValue="15"
                className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-white"
              />
            </label>
            <label className="text-xs text-white/45">
              Anticipación mínima (minutos)
              <input
                name="minimumNotice"
                type="number"
                min="0"
                max="43200"
                defaultValue="1440"
                className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-white"
              />
            </label>
            <label className="text-xs text-white/45">
              Horizonte de reserva (días)
              <input
                name="bookingHorizon"
                type="number"
                min="1"
                max="365"
                defaultValue="60"
                className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-white"
              />
            </label>
            <label className="text-xs text-white/45 sm:col-span-2">
              Límite diario opcional
              <input
                name="dailyLimit"
                type="number"
                min="1"
                max="50"
                placeholder="Sin límite"
                className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-white"
              />
            </label>
            <fieldset className="flex flex-wrap gap-4 text-xs text-white/50 sm:col-span-2">
              <legend className="mb-2">Modalidades</legend>
              {[
                ["IN_PERSON", "Presencial"],
                ["VIDEO_CALL", "Videollamada"],
                ["PHONE_CALL", "Telefónica"],
              ].map(([value, label]) => (
                <label className="flex items-center gap-2" key={value}>
                  <input
                    type="checkbox"
                    name="modalities"
                    value={value}
                    defaultChecked
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <button className="h-11 rounded-full bg-white text-[9px] font-bold uppercase tracking-[0.14em] text-black sm:col-span-2">
              Guardar regla
            </button>
          </form>
          <ul className="mt-6 divide-y divide-white/10">
            {rules.map((rule) => (
              <li className="py-3 text-sm text-white/50" key={rule.id}>
                {weekdays[rule.weekday]} · {time(rule.startMinutes)}–
                {time(rule.endMinutes)} · {rule.durationMinutes} min
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 p-6">
          <h2 className="font-serif text-3xl">Ausencia o bloqueo</h2>
          <form action={addOwnBlockedTime} className="mt-6 grid gap-4">
            <input
              name="startsAt"
              type="datetime-local"
              required
              className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
            />
            <input
              name="endsAt"
              type="datetime-local"
              required
              className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
            />
            <input
              name="reason"
              placeholder="Motivo prudente"
              maxLength={300}
              className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
            />
            <button className="h-11 rounded-full border border-white/20 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
              Bloquear periodo
            </button>
          </form>
          <ul className="mt-6 divide-y divide-white/10">
            {blocks.map((block) => (
              <li className="py-3 text-sm text-white/50" key={block.id}>
                {block.startsAt.toLocaleString("es-MX")} —{" "}
                {block.endsAt.toLocaleString("es-MX")}
                <span className="block text-xs text-white/30">
                  {block.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 p-6">
        <h2 className="font-serif text-3xl">Horario especial</h2>
        <p className="mt-2 text-sm text-white/40">
          Abre una franja extraordinaria —incluido fin de semana— o marca el día
          como no disponible.
        </p>
        <form
          action={saveOwnAvailabilityOverride}
          className="mt-6 grid gap-4 sm:grid-cols-3"
        >
          <input
            name="date"
            type="date"
            required
            className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
          />
          <input
            name="start"
            type="time"
            defaultValue="09:00"
            className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
          />
          <input
            name="end"
            type="time"
            defaultValue="13:00"
            className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
          />
          <input
            name="duration"
            type="number"
            min="15"
            max="240"
            defaultValue="45"
            className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
          />
          <input
            name="buffer"
            type="number"
            min="0"
            max="120"
            defaultValue="15"
            className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
          />
          <input
            name="reason"
            maxLength={300}
            placeholder="Motivo prudente"
            className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
          />
          <label className="flex items-center gap-2 text-xs text-white/50 sm:col-span-2">
            <input name="available" type="checkbox" defaultChecked />
            Disponible en la franja indicada
          </label>
          <button className="h-11 rounded-full bg-white text-[9px] font-bold uppercase tracking-[0.14em] text-black">
            Guardar excepción
          </button>
        </form>
        <ul className="mt-6 divide-y divide-white/10">
          {overrides.map((override) => (
            <li className="py-3 text-sm text-white/50" key={override.id}>
              {override.date.toLocaleDateString("es-MX", { timeZone: "UTC" })} ·{" "}
              {override.available ? "Franja extraordinaria" : "No disponible"}
              {override.available &&
              override.startMinutes != null &&
              override.endMinutes != null
                ? ` · ${time(override.startMinutes)}–${time(override.endMinutes)}`
                : ""}
              {override.reason ? (
                <span className="block text-xs text-white/30">
                  {override.reason}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
