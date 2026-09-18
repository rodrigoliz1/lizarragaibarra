import { NextResponse } from "next/server";

const MAX_PUBLIC_JSON_BYTES = 32 * 1024;

export type PublicApiResponse = {
  ok: boolean;
  reference?: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export function ensureSameOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new RequestSecurityError("Origen no permitido.", 403);
  }
  const origin = request.headers.get("origin");
  const deployed =
    Boolean(process.env.VERCEL_ENV) || process.env.NODE_ENV === "production";
  if (!origin) {
    if (deployed) throw new RequestSecurityError("Origen no permitido.", 403);
    return;
  }
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new RequestSecurityError("Origen no permitido.", 403);
  }
  const requestUrl = new URL(request.url);
  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProtocol =
    request.headers.get("x-forwarded-proto") ??
    requestUrl.protocol.slice(0, -1);
  const candidateOrigins = new Set([requestUrl.origin]);
  if (forwardedHost) {
    candidateOrigins.add(`${forwardedProtocol}://${forwardedHost}`);
  }
  for (const configured of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.AUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ]) {
    if (!configured) continue;
    try {
      candidateOrigins.add(new URL(configured).origin);
    } catch {
      // La validación centralizada reporta URLs de entorno inválidas.
    }
  }
  if (!candidateOrigins.has(originUrl.origin)) {
    throw new RequestSecurityError("Origen no permitido.", 403);
  }
}

export async function readPublicJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new RequestSecurityError(
      "El contenido debe enviarse como JSON.",
      415,
    );
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_PUBLIC_JSON_BYTES) {
    throw new RequestSecurityError("La solicitud es demasiado grande.", 413);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_PUBLIC_JSON_BYTES) {
    throw new RequestSecurityError("La solicitud es demasiado grande.", 413);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestSecurityError(
      "El cuerpo de la solicitud no es JSON válido.",
      400,
    );
  }
}

export class RequestSecurityError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function publicApiResponse(body: PublicApiResponse, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function isHoneypotTriggered(value?: string) {
  return Boolean(value?.trim());
}
