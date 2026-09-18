import { getPublicSiteSettings } from "@/server/services/site-settings-service";
import { NextResponse } from "next/server";

import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { availabilityQuerySchema } from "@/lib/validation";
import { getAvailableSlotLabels } from "@/server/services/availability-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await getPublicSiteSettings()).bookingEnabled)
      return NextResponse.json(
        {
          slots: [],
          message: "Coordine su consulta directamente con el equipo.",
        },
        { status: 503 },
      );
    await enforceRateLimit({
      request,
      scope: "public-availability",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });
    const url = new URL(request.url);
    const parsed = availabilityQuerySchema.safeParse({
      date: url.searchParams.get("date"),
      lawyerId: url.searchParams.get("lawyerId") || undefined,
      modality: url.searchParams.get("modality") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { slots: [], message: "La fecha o el profesional no son válidos." },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }
    const modalityMap = {
      PRESENCIAL: "IN_PERSON",
      VIDEOLLAMADA: "VIDEO_CALL",
      TELEFONICA: "PHONE_CALL",
    } as const;
    const slots = await getAvailableSlotLabels({
      ...parsed.data,
      modality: parsed.data.modality
        ? modalityMap[parsed.data.modality]
        : undefined,
    });
    return NextResponse.json(
      { slots },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { slots: [], message: error.message },
        {
          status: 429,
          headers: {
            "cache-control": "no-store",
            "retry-after": error.retryAfterSeconds.toString(),
          },
        },
      );
    }
    console.error("No fue posible consultar disponibilidad.");
    return NextResponse.json(
      {
        slots: [],
        message: "No fue posible consultar horarios. Intenta más tarde.",
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
