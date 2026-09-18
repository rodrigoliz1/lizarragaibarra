import { NextResponse } from "next/server";

import { generateIcsEvent } from "@/lib/calendar";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";
import { requireAppointmentAccess } from "@/server/services/appointment-negotiation-service";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const [{ appointmentId }, actor] = await Promise.all([
      context.params,
      requireActor(),
    ]);
    await requireAppointmentAccess(appointmentId, actor);
    const appointment = await db.appointment.findFirst({
      where: { id: appointmentId, status: "CONFIRMED" },
      include: { practiceArea: { select: { name: true } } },
    });
    if (!appointment)
      return NextResponse.json(
        { message: "La cita aún no está confirmada." },
        { status: 409 },
      );
    const calendar = generateIcsEvent({
      uid: `${appointment.icsUid}@lizarragaibarra.com`,
      sequence: appointment.icsSequence,
      startsAt: appointment.confirmedStartAt ?? appointment.startAt,
      endsAt: appointment.confirmedEndAt ?? appointment.endAt,
      summary: `Consulta LIZÁRRAGA & IBARRA ABOGADOS · ${appointment.practiceArea.name}`,
      description: `Referencia ${appointment.reference}. Consulta legal privada.`,
      location: appointment.meetingUrl || appointment.location,
      organizer: {
        name: "LIZÁRRAGA & IBARRA ABOGADOS",
        email:
          process.env.EMAIL_FROM_ADDRESS ||
          "notificaciones@lizarragaibarra.com",
      },
      attendee: { name: appointment.fullName, email: appointment.email },
    });
    return new NextResponse(calendar, {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `attachment; filename="${appointment.reference}.ics"`,
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex",
      },
    });
  } catch (error) {
    const status = error instanceof ServiceError ? error.status : 500;
    return NextResponse.json(
      {
        message:
          status === 500
            ? "No fue posible generar el calendario."
            : error instanceof Error
              ? error.message
              : "Acceso no permitido.",
      },
      { status },
    );
  }
}
