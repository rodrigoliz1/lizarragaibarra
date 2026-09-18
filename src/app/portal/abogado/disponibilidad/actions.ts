"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

function minutes(value: FormDataEntryValue | null) {
  const [hour, minute] = String(value || "")
    .split(":")
    .map(Number);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  )
    throw new Error("Horario inválido.");
  return hour * 60 + minute;
}

export async function saveOwnAvailability(formData: FormData) {
  const actor = await requireActor(["LAWYER"]);
  if (!actor.lawyerProfileId)
    throw new Error("Perfil profesional no disponible.");
  const weekday = Number(formData.get("weekday"));
  const startMinutes = minutes(formData.get("start"));
  const endMinutes = minutes(formData.get("end"));
  const durationMinutes = Number(formData.get("duration"));
  const bufferMinutes = Number(formData.get("buffer"));
  const minimumNoticeMinutes = Number(formData.get("minimumNotice"));
  const bookingHorizonDays = Number(formData.get("bookingHorizon"));
  const dailyLimitValue = String(formData.get("dailyLimit") || "").trim();
  const dailyLimit = dailyLimitValue ? Number(dailyLimitValue) : null;
  const modalities = ["IN_PERSON", "VIDEO_CALL", "PHONE_CALL"].filter(
    (modality) => formData.getAll("modalities").includes(modality),
  ) as ("IN_PERSON" | "VIDEO_CALL" | "PHONE_CALL")[];
  if (
    weekday < 0 ||
    weekday > 6 ||
    startMinutes >= endMinutes ||
    durationMinutes < 15 ||
    durationMinutes > 240 ||
    bufferMinutes < 0 ||
    bufferMinutes > 120 ||
    minimumNoticeMinutes < 0 ||
    minimumNoticeMinutes > 43200 ||
    bookingHorizonDays < 1 ||
    bookingHorizonDays > 365 ||
    (dailyLimit !== null && (dailyLimit < 1 || dailyLimit > 50)) ||
    modalities.length === 0
  )
    throw new Error("Revisa la regla de disponibilidad.");
  await db.$transaction(async (transaction) => {
    await transaction.availabilityRule.create({
      data: {
        lawyerId: actor.lawyerProfileId!,
        weekday,
        startMinutes,
        endMinutes,
        durationMinutes,
        bufferMinutes,
        minimumNoticeMinutes,
        bookingHorizonDays,
        modalities,
        dailyLimit,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "AVAILABILITY_RULE_CREATED",
        entityType: "LawyerProfile",
        entityId: actor.lawyerProfileId!,
      },
    });
  });
  revalidatePath("/portal/abogado/disponibilidad");
}

export async function saveOwnAvailabilityOverride(formData: FormData) {
  const actor = await requireActor(["LAWYER"]);
  if (!actor.lawyerProfileId)
    throw new Error("Perfil profesional no disponible.");
  const dateValue = String(formData.get("date") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue))
    throw new Error("La fecha especial no es válida.");
  const available = formData.get("available") === "on";
  const startMinutes = available ? minutes(formData.get("start")) : null;
  const endMinutes = available ? minutes(formData.get("end")) : null;
  const durationMinutes = available ? Number(formData.get("duration")) : null;
  const bufferMinutes = available ? Number(formData.get("buffer")) : null;
  if (
    available &&
    (startMinutes === null ||
      endMinutes === null ||
      startMinutes >= endMinutes ||
      !durationMinutes ||
      durationMinutes < 15 ||
      durationMinutes > 240 ||
      bufferMinutes === null ||
      bufferMinutes < 0 ||
      bufferMinutes > 120)
  )
    throw new Error("Revisa la franja extraordinaria.");
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const override = await db.lawyerAvailabilityOverride.upsert({
    where: {
      lawyerId_date: { lawyerId: actor.lawyerProfileId, date },
    },
    update: {
      available,
      startMinutes,
      endMinutes,
      durationMinutes,
      bufferMinutes,
      reason: String(formData.get("reason") || "").slice(0, 300) || null,
    },
    create: {
      lawyerId: actor.lawyerProfileId,
      date,
      available,
      startMinutes,
      endMinutes,
      durationMinutes,
      bufferMinutes,
      reason: String(formData.get("reason") || "").slice(0, 300) || null,
    },
  });
  await db.auditLog.create({
    data: {
      actorId: actor.id,
      action: "AVAILABILITY_OVERRIDE_SAVED",
      entityType: "LawyerAvailabilityOverride",
      entityId: override.id,
    },
  });
  revalidatePath("/portal/abogado/disponibilidad");
}

export async function addOwnBlockedTime(formData: FormData) {
  const actor = await requireActor(["LAWYER"]);
  if (!actor.lawyerProfileId)
    throw new Error("Perfil profesional no disponible.");
  const startsAt = new Date(String(formData.get("startsAt")));
  const endsAt = new Date(String(formData.get("endsAt")));
  if (
    !Number.isFinite(startsAt.getTime()) ||
    !Number.isFinite(endsAt.getTime()) ||
    startsAt >= endsAt
  )
    throw new Error("El periodo bloqueado no es válido.");
  const blocked = await db.blockedTime.create({
    data: {
      lawyerId: actor.lawyerProfileId,
      startsAt,
      endsAt,
      reason: String(formData.get("reason") || "Ausencia").slice(0, 300),
    },
  });
  await db.auditLog.create({
    data: {
      actorId: actor.id,
      action: "AVAILABILITY_BLOCK_CREATED",
      entityType: "BlockedTime",
      entityId: blocked.id,
    },
  });
  revalidatePath("/portal/abogado/disponibilidad");
}
