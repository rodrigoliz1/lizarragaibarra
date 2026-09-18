import { describe, expect, it } from "vitest";

import { formatDateInTimeZone } from "@/lib/calendar/dates";
import {
  appointmentSchema,
  articleEditorSchema,
  availabilityQuerySchema,
  contactSchema,
} from "@/lib/validation";

function validFutureDate() {
  return formatDateInTimeZone(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
}

describe("contactSchema", () => {
  it("normaliza texto y acepta una solicitud válida", () => {
    const result = contactSchema.parse({
      name: "  María   Pérez  ",
      email: " MARIA@EXAMPLE.COM ",
      phone: "+52 33 1234 5678",
      company: "  Empresa   Demo ",
      practiceArea: "Litigio",
      message: "Necesito información general sobre una posible controversia.",
      privacyAccepted: true,
      website: "",
    });
    expect(result.name).toBe("María Pérez");
    expect(result.email).toBe("maria@example.com");
    expect(result.company).toBe("Empresa Demo");
  });

  it("rechaza consentimiento ausente, teléfono inválido y mensajes mínimos", () => {
    const result = contactSchema.safeParse({
      name: "María Pérez",
      email: "maria@example.com",
      phone: "123",
      message: "Hola",
      privacyAccepted: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phone).toBeDefined();
      expect(result.error.flatten().fieldErrors.message).toBeDefined();
      expect(result.error.flatten().fieldErrors.privacyAccepted).toBeDefined();
    }
  });
});

describe("appointmentSchema", () => {
  const valid = {
    fullName: "María Pérez",
    email: "maria@example.com",
    phone: "+52 33 1234 5678",
    practiceArea: "litigio-solucion-conflictos",
    modality: "VIDEOLLAMADA" as const,
    date: validFutureDate(),
    time: "10:00",
    description:
      "Deseo una consulta inicial para explicar el contexto general del asunto.",
    privacyAccepted: true,
    website: "",
  };

  it("acepta una cita futura válida", () => {
    expect(appointmentSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza fechas pasadas y fechas calendáricas imposibles", () => {
    expect(
      appointmentSchema.safeParse({ ...valid, date: "2020-01-01" }).success,
    ).toBe(false);
    expect(
      appointmentSchema.safeParse({ ...valid, date: "2027-02-30" }).success,
    ).toBe(false);
  });

  it("rechaza campos no declarados", () => {
    expect(appointmentSchema.safeParse({ ...valid, admin: true }).success).toBe(
      false,
    );
  });
});

describe("disponibilidad y editor editorial", () => {
  it("valida modalidad de disponibilidad sin admitir parámetros arbitrarios", () => {
    expect(
      availabilityQuerySchema.safeParse({
        date: validFutureDate(),
        modality: "VIDEOLLAMADA",
      }).success,
    ).toBe(true);
    expect(
      availabilityQuerySchema.safeParse({
        date: validFutureDate(),
        modality: "SECRETA",
      }).success,
    ).toBe(false);
  });

  it("acepta coautoría e imagen sólo mediante identificadores estructurados", () => {
    const validCuid = "cm00000000000000000000001";
    const result = articleEditorSchema.safeParse({
      title: "Análisis mercantil contemporáneo",
      slug: "analisis-mercantil-contemporaneo",
      excerpt:
        "Una revisión práctica de criterios relevantes para operaciones mercantiles.",
      references: [],
      tags: ["mercantil"],
      heroMediaId: validCuid,
      coauthorIds: ["cm00000000000000000000002"],
      blocks: [{ type: "PARAGRAPH", text: "Contenido jurídico prudente." }],
    });
    expect(result.success).toBe(true);
    expect(
      articleEditorSchema.safeParse({
        title: "Análisis mercantil contemporáneo",
        slug: "analisis-mercantil-contemporaneo",
        excerpt:
          "Una revisión práctica de criterios relevantes para operaciones mercantiles.",
        heroMediaId: "../../public/archivo.jpg",
        blocks: [{ type: "PARAGRAPH", text: "Contenido" }],
      }).success,
    ).toBe(false);
  });
});
