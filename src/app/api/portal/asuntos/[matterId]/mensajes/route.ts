import { NextResponse } from "next/server";
import { Visibility } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import {
  ensureSameOrigin,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { portalMessageSchema } from "@/lib/validation";
import {
  canSeeRestrictedInternalContent,
  requireActor,
  requireMatterAccess,
} from "@/server/policies";
import { ServiceError } from "@/server/services/errors";
import { createPortalMessage } from "@/server/services/portal-service";

export const runtime = "nodejs";

const messageQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ matterId: string }> },
) {
  try {
    const [{ matterId }, actor] = await Promise.all([
      context.params,
      requireActor(),
    ]);
    await requireMatterAccess(matterId, actor);
    const url = new URL(request.url);
    const query = messageQuerySchema.safeParse({
      cursor: url.searchParams.get("cursor") || undefined,
      limit: url.searchParams.get("limit") || undefined,
    });
    if (!query.success) {
      return NextResponse.json(
        { ok: false, message: "Paginación no válida." },
        { status: 400 },
      );
    }
    const messages = await db.message.findMany({
      where: {
        matterId,
        deletedAt: null,
        ...(actor.role === "CLIENT"
          ? {
              visibility: {
                in: [Visibility.CLIENT, Visibility.CLIENT_VISIBLE],
              },
            }
          : canSeeRestrictedInternalContent(actor)
            ? {}
            : {
                visibility: {
                  in: [
                    Visibility.CLIENT,
                    Visibility.CLIENT_VISIBLE,
                    Visibility.INTERNAL,
                  ],
                },
              }),
      },
      ...(query.data.cursor
        ? { cursor: { id: query.data.cursor }, skip: 1 }
        : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.data.limit,
      select: {
        id: true,
        body: true,
        visibility: true,
        createdAt: true,
        sender: { select: { id: true, name: true, role: true } },
      },
    });
    return NextResponse.json(
      {
        ok: true,
        data: messages.toReversed().map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
        })),
        nextCursor:
          messages.length === query.data.limit
            ? messages[messages.length - 1]?.id
            : null,
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    const status = error instanceof ServiceError ? error.status : 500;
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof ServiceError
            ? error.message
            : "No fue posible consultar los mensajes.",
      },
      { status, headers: { "cache-control": "private, no-store" } },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ matterId: string }> },
) {
  try {
    ensureSameOrigin(request);
    const [{ matterId }, actor, body] = await Promise.all([
      context.params,
      requireActor(),
      readPublicJson(request),
    ]);
    const parsed = portalMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "El mensaje no es válido.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: { "cache-control": "private, no-store" } },
      );
    }
    await enforceRateLimit({
      request,
      scope: "portal-message",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      secondaryKey: actor.id,
    });
    const message = await createPortalMessage(actor, matterId, parsed.data);
    return NextResponse.json(
      { ok: true, message: "Mensaje enviado.", data: message },
      { status: 201, headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    const status =
      error instanceof RateLimitError
        ? 429
        : error instanceof RequestSecurityError || error instanceof ServiceError
          ? error.status
          : 500;
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && status !== 500
            ? error.message
            : "No fue posible enviar el mensaje.",
      },
      { status, headers: { "cache-control": "private, no-store" } },
    );
  }
}
