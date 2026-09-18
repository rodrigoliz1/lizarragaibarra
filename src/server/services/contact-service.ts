import { Prisma } from "@prisma/client";

import { trackServerEvent } from "@/lib/analytics";
import { db } from "@/lib/db";
import { renderTransactionalEmail, sendTrackedEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { createPublicReference } from "@/lib/security/tokens";
import type { ContactInput } from "@/lib/validation";
import {
  createDevelopmentContact,
  developmentMemoryEnabled,
} from "@/server/services/dev-memory";

export async function createContactSubmission(input: ContactInput) {
  if (developmentMemoryEnabled()) {
    const result = createDevelopmentContact(input);
    trackServerEvent("submit_contact", {
      hasPracticeArea: Boolean(input.practiceArea),
      provider: "development-memory",
    });
    return result;
  }
  const reference = createPublicReference("CONTACTO");
  const submission = await db.contactSubmission.create({
    data: {
      reference,
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      practiceArea: input.practiceArea,
      message: input.message,
      privacyAcceptedAt: new Date(),
    },
    select: { id: true },
  });
  await db.auditLog.create({
    data: {
      action: "CONTACT_SUBMISSION_CREATED",
      entityType: "ContactSubmission",
      entityId: submission.id,
      metadata: { reference } as Prisma.InputJsonValue,
    },
  });

  const recipient =
    process.env.CONTACT_RECIPIENT_EMAIL ||
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
    "r.lizarraga@lizarragaibarra.com";
  const officeEmail = renderTransactionalEmail({
    eyebrow: "Contacto",
    title: `Nueva solicitud ${reference}`,
    paragraphs: [input.message],
    details: [
      { label: "Nombre", value: input.name },
      { label: "Correo", value: input.email },
      { label: "Teléfono", value: input.phone },
      { label: "Empresa", value: input.company },
      { label: "Área", value: input.practiceArea },
      {
        label: "Fecha",
        value: new Date().toLocaleString("es-MX", {
          timeZone: "America/Mexico_City",
        }),
      },
    ],
    action: {
      label: "Abrir formularios",
      url: new URL("/admin/formularios", getSiteUrl()).toString(),
    },
  });
  const clientEmail = renderTransactionalEmail({
    eyebrow: "Contacto",
    title: "Recibimos su mensaje",
    greeting: `Hola ${input.name},`,
    paragraphs: [
      `Registramos su mensaje con la referencia ${reference}.`,
      "Nuestro equipo revisará la solicitud y responderá tan pronto como resulte razonablemente posible, sin que ello implique un plazo garantizado.",
    ],
    details: [{ label: "Referencia", value: reference }],
  });

  await Promise.allSettled([
    sendTrackedEmail({
      to: recipient,
      subject: `Nueva solicitud de contacto ${reference}`,
      template: "contact-office-notification",
      ...officeEmail,
      replyTo: input.email,
      tags: ["contact", "office"],
      metadata: { "X-LI-Reference": reference },
    }),
    sendTrackedEmail({
      to: input.email,
      subject: `Recibimos tu mensaje · ${reference}`,
      template: "contact-receipt",
      ...clientEmail,
      tags: ["contact", "client"],
      metadata: { "X-LI-Reference": reference },
    }),
  ]);
  trackServerEvent("submit_contact", {
    hasPracticeArea: Boolean(input.practiceArea),
  });
  return { reference };
}
