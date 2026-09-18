import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  ensureSameOrigin,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { appointmentSchema, zodFieldErrors } from "@/lib/validation";
import { requireActor } from "@/server/policies";
import { createAppointment } from "@/server/services/appointment-service";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const [actor, body] = await Promise.all([
      requireActor(["CLIENT"]),
      readPublicJson(request),
    ]);
    const record = z.record(z.string(), z.unknown()).parse(body);
    const matterId = z.string().cuid().parse(record.matterId);
    const appointmentRecord = { ...record };
    delete appointmentRecord.matterId;
    if (!actor.clientProfileId) {
      return NextResponse.json(
        { ok: false, message: "El perfil del cliente no está disponible." },
        { status: 409 },
      );
    }
    const [user, matter] = await Promise.all([
      db.user.findUnique({
        where: { id: actor.id },
        select: {
          name: true,
          email: true,
          clientProfile: { select: { phone: true, company: true } },
        },
      }),
      db.matter.findFirst({
        where: { id: matterId, clientId: actor.clientProfileId },
        select: {
          id: true,
          practiceArea: { select: { slug: true } },
          assignments: {
            where: { role: { in: ["LEAD", "LEAD_LAWYER"] } },
            orderBy: { assignedAt: "asc" },
            take: 1,
            select: {
              lawyer: {
                select: {
                  id: true,
                  slug: true,
                  user: { select: { id: true } },
                  areas: {
                    orderBy: { isPrimary: "desc" },
                    take: 1,
                    select: { practiceArea: { select: { slug: true } } },
                  },
                },
              },
            },
          },
        },
      }),
    ]);
    const lead = matter?.assignments[0]?.lawyer;
    const practiceArea =
      matter?.practiceArea?.slug || lead?.areas[0]?.practiceArea.slug;
    if (!user?.clientProfile || !matter || !practiceArea || !lead) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "El asunto todavía no tiene un abogado responsable o área disponible.",
        },
        { status: 409 },
      );
    }
    const parsed = appointmentSchema.safeParse({
      ...appointmentRecord,
      fullName: user.name,
      email: user.email,
      phone: user.clientProfile.phone,
      company: user.clientProfile.company || undefined,
      practiceArea,
      lawyerId: lead.slug,
      website: "",
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Revisa los campos señalados.",
          fieldErrors: zodFieldErrors(parsed.error),
        },
        { status: 400 },
      );
    }
    const result = await createAppointment(parsed.data, {
      actorId: actor.id,
      clientProfileId: actor.clientProfileId,
      matterId: matter.id,
    });
    if (lead.user?.id) {
      await db.notification.create({
        data: {
          recipientId: lead.user.id,
          type: "APPOINTMENT_PROPOSAL",
          title: "Solicitud preferente de un cliente",
          body: "Un cliente asignado solicitó una cita desde su portal.",
          href: "/portal/abogado/citas",
          metadata: { appointmentId: result.id, matterId: matter.id },
        },
      });
    }
    return NextResponse.json(
      {
        ok: true,
        reference: result.reference,
        message: "Solicitud preferente enviada a su abogado responsable.",
      },
      { status: 201 },
    );
  } catch (error) {
    const status =
      error instanceof RequestSecurityError || error instanceof ServiceError
        ? error.status
        : error instanceof z.ZodError
          ? 400
          : 500;
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && status !== 500
            ? error.message
            : "No fue posible registrar la cita preferente.",
      },
      { status },
    );
  }
}
