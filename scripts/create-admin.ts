import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

import { hashPassword } from "../src/lib/security/passwords";

const argumentsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(120),
  updatePassword: z.boolean(),
});

function argumentValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    throw new Error(
      "Configura DATABASE_URL y DIRECT_URL antes de crear el administrador.",
    );
  }
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password) {
    throw new Error(
      "Define ADMIN_INITIAL_PASSWORD únicamente durante esta operación. No la guardes en Vercel ni en el repositorio.",
    );
  }
  const passwordSchema = z
    .string()
    .min(14)
    .max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/);
  if (!passwordSchema.safeParse(password).success) {
    throw new Error(
      "ADMIN_INITIAL_PASSWORD debe tener al menos 14 caracteres e incluir mayúscula, minúscula, número y símbolo.",
    );
  }
  const input = argumentsSchema.parse({
    email: argumentValue("--email"),
    name:
      argumentValue("--name") || "Administración LIZÁRRAGA & IBARRA ABOGADOS",
    updatePassword: process.argv.includes("--update-password"),
  });
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, role: true },
    });
    if (existing && existing.role !== UserRole.ADMIN) {
      throw new Error(
        "Ya existe una cuenta con ese correo y un rol distinto. Revísala manualmente.",
      );
    }
    if (existing && !input.updatePassword) {
      throw new Error(
        "El administrador ya existe. Usa --update-password únicamente si deseas rotar su contraseña.",
      );
    }
    const passwordHash = await hashPassword(password);
    await prisma.user.upsert({
      where: { email: input.email },
      create: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      update: {
        name: input.name,
        passwordHash,
        status: UserStatus.ACTIVE,
        sessionVersion: { increment: 1 },
      },
    });
    console.info(`Administrador configurado para ${input.email}.`);
    console.info("La contraseña no se mostró ni se almacenó en texto plano.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "No fue posible crear el administrador.",
  );
  process.exitCode = 1;
});
