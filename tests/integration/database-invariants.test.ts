import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("TEST_DATABASE_URL es obligatoria.");
const parsedUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedUrl.hostname) ||
  !parsedUrl.pathname.toLowerCase().includes("test")
) {
  throw new Error(
    "Las pruebas de integración sólo admiten una base local con 'test' en el nombre.",
  );
}

const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
const prefix = `integration-${Date.now()}`;

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  await prisma.mfaRecoveryCode.deleteMany({
    where: { user: { email: { startsWith: prefix } } },
  });
  await prisma.userSession.deleteMany({
    where: { user: { email: { startsWith: prefix } } },
  });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe("invariantes PostgreSQL", () => {
  it("impide reutilizar el hash de un código de recuperación", async () => {
    const user = await prisma.user.create({
      data: {
        name: "Integration User",
        email: `${prefix}@example.test`,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    await prisma.mfaRecoveryCode.create({
      data: { userId: user.id, codeHash: `${prefix}-hash` },
    });
    await expect(
      prisma.mfaRecoveryCode.create({
        data: { userId: user.id, codeHash: `${prefix}-hash` },
      }),
    ).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("registra y revoca una sesión individual", async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: `${prefix}@example.test` },
    });
    const session = await prisma.userSession.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    expect(
      await prisma.userSession.count({
        where: { id: session.id, revokedAt: null },
      }),
    ).toBe(0);
  });
});
