import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ServiceError } from "@/server/services/errors";
import { RequestSecurityError } from "@/lib/security/request";
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        ok: false,
        message: "Revise los campos del formulario.",
        fields: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  if (error instanceof ServiceError || error instanceof RequestSecurityError)
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.status },
    );
  return NextResponse.json(
    {
      ok: false,
      message:
        "No fue posible completar la operación. Revise los datos e intente nuevamente.",
    },
    { status: 500 },
  );
}
