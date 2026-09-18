import { createHash, randomBytes } from "node:crypto";

import { BrevoClient } from "@getbrevo/brevo";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

import {
  emailFailureDisposition,
  getEmailOutboxPolicy,
} from "../src/lib/email/outbox-policy";
import { encryptSensitiveJson } from "../src/lib/security/encryption";

const prisma = new PrismaClient();
const value = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const schema = z.object({
  kind: z.enum(["client", "lawyer"]),
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  rank: z.enum(["partner", "associate"]).default("associate"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  sendInvite: z.boolean(),
});

async function main() {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL)
    throw new Error("Configura DATABASE_URL y DIRECT_URL.");
  const input = schema.parse({
    kind: value("--kind"),
    email: value("--email"),
    name: value("--name"),
    phone: value("--phone"),
    company: value("--company"),
    rank: value("--rank") || "associate",
    slug: value("--slug"),
    sendInvite: process.argv.includes("--send-invite"),
  });
  if (input.kind === "lawyer" && !input.slug)
    throw new Error("--slug es obligatorio para lawyer:create.");
  if (
    await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    })
  )
    throw new Error("La cuenta ya existe; el script no sobrescribe usuarios.");

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiryHours = Math.min(
    168,
    Math.max(1, Number(process.env.ACCOUNT_INVITE_EXPIRY_HOURS || 48)),
  );
  const user = await prisma.$transaction(async (transaction) => {
    const created = await transaction.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.kind === "client" ? "CLIENT" : "LAWYER",
        status: "INVITED",
        passwordHash: null,
        ...(input.kind === "client"
          ? {
              clientProfile: {
                create: { phone: input.phone, company: input.company },
              },
            }
          : {
              lawyerProfile: {
                create: {
                  slug: input.slug!,
                  displayName: input.name,
                  position: input.rank === "partner" ? "Socio" : "Asociado",
                  rank: input.rank === "partner" ? "PARTNER" : "ASSOCIATE",
                  phone: input.phone,
                  bio: "",
                  education: "",
                  active: false,
                },
              },
            }),
        actionTokens: {
          create: {
            email: input.email,
            type: "ACCOUNT_INVITE",
            tokenHash,
            expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
            lastSentAt: input.sendInvite ? new Date() : null,
          },
        },
      },
      select: { id: true, email: true },
    });
    await transaction.auditLog.create({
      data: {
        action: "USER_INVITED_BY_SCRIPT",
        entityType: "User",
        entityId: created.id,
        metadata: {
          role: input.kind === "client" ? "CLIENT" : "LAWYER",
        },
      },
    });
    return created;
  });

  if (input.sendInvite) {
    if (
      !process.env.BREVO_API_KEY ||
      !process.env.EMAIL_FROM_ADDRESS ||
      !process.env.EMAIL_FROM_NAME
    )
      throw new Error(
        "La cuenta se creó, pero Brevo no está configurado. Reintenta la invitación desde ADMIN.",
      );
    const activation = new URL(
      "/portal/activar",
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    );
    activation.searchParams.set("token", token);
    const subject = "Activa tu cuenta de LIZÁRRAGA & IBARRA ABOGADOS";
    const text = `Hola ${input.name},\n\nActiva tu cuenta individual mediante este enlace de un solo uso:\n${activation}\n\nLIZÁRRAGA & IBARRA ABOGADOS nunca envía contraseñas temporales.`;
    const safeName = input.name.replace(/[<>&"]/g, "");
    const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><div style="background:#080808;color:#fff;padding:28px"><strong>LIZÁRRAGA & IBARRA ABOGADOS</strong></div><div style="padding:30px"><h1>Activa tu cuenta</h1><p>Hola ${safeName},</p><p>Define tu contraseña personal mediante el enlace seguro.</p><p><a href="${activation.toString()}" style="background:#111;color:#fff;padding:12px 20px;text-decoration:none">Activar cuenta</a></p><p>El enlace es de un solo uso. Nunca enviamos contraseñas temporales.</p></div></div>`;
    const attemptStartedAt = new Date();
    const workerId = `account-script-${process.pid}`;
    const outboxPolicy = getEmailOutboxPolicy(process.env);
    const outbox = await prisma.emailOutbox.create({
      data: {
        recipient: input.email,
        subject,
        template:
          input.kind === "client"
            ? "client-invitation"
            : input.rank === "partner"
              ? "partner-invitation"
              : "lawyer-invitation",
        payload: Prisma.DbNull,
        encryptedPayload: encryptSensitiveJson(
          { version: 1, to: [input.email], text, html },
          process.env,
        ),
        status: "PROCESSING",
        attempts: 1,
        lastAttemptAt: attemptStartedAt,
        lockedAt: attemptStartedAt,
        lockedBy: workerId,
      },
    });
    try {
      const brevo = new BrevoClient({
        apiKey: process.env.BREVO_API_KEY,
        timeoutInSeconds: 15,
        maxRetries: 0,
      });
      const result = await brevo.transactionalEmails.sendTransacEmail({
        sender: {
          email: process.env.EMAIL_FROM_ADDRESS,
          name: process.env.EMAIL_FROM_NAME,
        },
        to: [{ email: input.email }],
        subject,
        textContent: text,
        htmlContent: html,
      });
      await prisma.emailOutbox.update({
        where: { id: outbox.id },
        data: {
          status: "SENT",
          providerId: result.messageId || result.messageIds?.[0],
          sentAt: new Date(),
          payload: Prisma.DbNull,
          encryptedPayload: null,
          lockedAt: null,
          lockedBy: null,
        },
      });
    } catch {
      const disposition = emailFailureDisposition(
        attemptStartedAt,
        1,
        outboxPolicy,
      );
      await prisma.emailOutbox.update({
        where: { id: outbox.id },
        data: {
          status: disposition.status,
          failedAt: new Date(),
          nextAttemptAt: disposition.nextAttemptAt,
          lockedAt: null,
          lockedBy: null,
          lastError: "Brevo no pudo completar el envío.",
        },
      });
      throw new Error(
        "La cuenta se creó, pero la invitación falló y quedó disponible para reintento en ADMIN.",
      );
    }
  }
  console.info(`Cuenta invitada creada para ${user.email}.`);
  console.info("No se imprimió token ni contraseña.");
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : "No fue posible crear la cuenta.",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
