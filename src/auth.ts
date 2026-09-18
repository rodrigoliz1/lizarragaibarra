import type { DefaultSession } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createHash, randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { isDemoAuthAllowed, isPublicProduction } from "@/lib/environment";
import { decryptSensitiveString } from "@/lib/security/encryption";
import { verifyPassword } from "@/lib/security/passwords";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { hashRecoveryCode, verifyTotp } from "@/lib/security/totp";
import { loginSchema } from "@/lib/validation/auth";

type SessionRole = "CLIENT" | "LAWYER" | "ADMIN";
type SessionLawyerRank = "PARTNER" | "ASSOCIATE";
const DUMMY_PASSWORD_HASH =
  "$2b$12$H31v3/S0zlVut2.ymQ/YQ.xEPA.ZvcIEnWScs1myqDWlKleE3S/qK";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      email: string;
      role: SessionRole;
      active: boolean;
      sessionVersion: number;
      lawyerRank: SessionLawyerRank | null;
      mfaEnabled: boolean;
      mfaRequired: boolean;
      mfaVerified: boolean;
      sessionId: string;
    };
  }

  interface User {
    role: SessionRole;
    active: boolean;
    sessionVersion: number;
    lawyerRank?: SessionLawyerRank | null;
    mfaEnabled: boolean;
    mfaRequired: boolean;
    mfaVerified: boolean;
    sessionId: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: SessionRole;
    active?: boolean;
    sessionVersion?: number;
    lawyerRank?: SessionLawyerRank | null;
    mfaEnabled?: boolean;
    mfaRequired?: boolean;
    mfaVerified?: boolean;
    sessionStartedAt?: number;
    lastActivityAt?: number;
    sessionId?: string;
    sessionLastPersistedAt?: number;
  }
}

function demoLoginAllowed(email: string) {
  if (!email.endsWith("@li.test")) return true;
  return isDemoAuthAllowed();
}

function isDeployedRuntime() {
  return (
    Boolean(process.env.VERCEL_ENV) || process.env.NODE_ENV === "production"
  );
}

function authSecret() {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured) {
    if (isDeployedRuntime() && configured.length < 32) {
      throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.");
    }
    return configured;
  }
  if (isDeployedRuntime()) {
    throw new Error("AUTH_SECRET es obligatorio en Preview y Production.");
  }
  throw new Error("Configure AUTH_SECRET para habilitar la autenticación.");
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const absoluteSessionMs =
  positiveNumber(process.env.SESSION_MAX_AGE_SECONDS, 8 * 60 * 60) * 1000;
const idleSessionMs =
  positiveNumber(process.env.SESSION_IDLE_TIMEOUT_SECONDS, 60 * 60) * 1000;

async function verifySecondFactor(input: {
  userId: string;
  secretEncrypted: string;
  candidate?: string;
}) {
  const candidate = input.candidate?.trim();
  if (!candidate) return false;
  try {
    const secret = decryptSensitiveString(input.secretEncrypted);
    if (verifyTotp(secret, candidate)) return true;
  } catch {
    return false;
  }

  try {
    const recoveryCode = await db.mfaRecoveryCode.updateMany({
      where: {
        userId: input.userId,
        codeHash: hashRecoveryCode(candidate),
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
    return recoveryCode.count === 1;
  } catch {
    return false;
  }
}

async function recordLoginEvent(input: {
  actorId?: string;
  success: boolean;
  reason?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.success ? "AUTH_LOGIN_SUCCEEDED" : "AUTH_LOGIN_FAILED",
        entityType: "User",
        entityId: input.actorId ?? "unknown",
        metadata: input.reason ? { reason: input.reason } : undefined,
      },
    });
  } catch {
    // La indisponibilidad de auditoría no debe revelar si una cuenta existe.
  }
}

function sessionRequestMetadata(request: Request) {
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const salt = process.env.RATE_LIMIT_SALT?.trim() || authSecret();
  return {
    ipHash: createHash("sha256")
      .update(`${salt}:${address}`, "utf8")
      .digest("hex"),
    userAgent: (request.headers.get("user-agent") || "Desconocido").slice(
      0,
      300,
    ),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret(),
  trustHost:
    Boolean(process.env.VERCEL_ENV) ||
    !isPublicProduction() ||
    process.env.AUTH_TRUST_HOST === "true",
  useSecureCookies: Boolean(process.env.VERCEL_ENV) || isPublicProduction(),
  session: {
    strategy: "jwt",
    maxAge: Math.floor(absoluteSessionMs / 1000),
    updateAge: Math.min(30 * 60, Math.floor(idleSessionMs / 2000)),
  },
  pages: {
    signIn: "/portal/iniciar-sesion",
  },
  providers: [
    Credentials({
      name: "Correo y contraseña",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
        otp: { label: "Código de seguridad", type: "text" },
      },
      authorize: async (credentials, request) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success || !demoLoginAllowed(parsed.data.email))
          return null;

        try {
          await enforceRateLimit({
            request,
            scope: "credentials-login",
            limit: 8,
            windowMs: 15 * 60 * 1000,
            secondaryKey: parsed.data.email,
          });
        } catch {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
            status: true,
            sessionVersion: true,
            mfaEnabled: true,
            mfaSecretEncrypted: true,
            lawyerProfile: { select: { rank: true } },
          },
        });
        if (!user || user.status !== "ACTIVE") {
          await verifyPassword(parsed.data.password, DUMMY_PASSWORD_HASH);
          await recordLoginEvent({ success: false, reason: "invalid" });
          return null;
        }
        if (
          !user.passwordHash ||
          !(await verifyPassword(parsed.data.password, user.passwordHash))
        ) {
          await recordLoginEvent({
            actorId: user.id,
            success: false,
            reason: "invalid",
          });
          return null;
        }

        const lawyerRank = user.lawyerProfile?.rank ?? null;
        const mfaRequired = false;
        const mfaVerified = user.mfaEnabled
          ? Boolean(
              user.mfaSecretEncrypted &&
              (await verifySecondFactor({
                userId: user.id,
                secretEncrypted: user.mfaSecretEncrypted,
                candidate: parsed.data.otp,
              })),
            )
          : false;
        if (user.mfaEnabled && !mfaVerified) {
          await recordLoginEvent({
            actorId: user.id,
            success: false,
            reason: "invalid",
          });
          return null;
        }

        const sessionId = randomUUID();
        const now = new Date();
        const metadata = sessionRequestMetadata(request);
        await db.$transaction([
          db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: now },
          }),
          db.userSession.create({
            data: {
              id: sessionId,
              userId: user.id,
              expiresAt: new Date(now.getTime() + absoluteSessionMs),
              ...metadata,
            },
          }),
        ]);
        await recordLoginEvent({ actorId: user.id, success: true });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: true,
          sessionVersion: user.sessionVersion,
          lawyerRank,
          mfaEnabled: user.mfaEnabled,
          mfaRequired,
          mfaVerified,
          sessionId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.active = user.active;
        token.sessionVersion = user.sessionVersion;
        token.lawyerRank = user.lawyerRank ?? null;
        token.mfaEnabled = user.mfaEnabled;
        token.mfaRequired = user.mfaRequired;
        token.mfaVerified = user.mfaVerified;
        token.sessionStartedAt = Date.now();
        token.lastActivityAt = Date.now();
        token.sessionId = user.sessionId;
        token.sessionLastPersistedAt = Date.now();
        return token;
      }

      if (!token.sub || !token.sessionId) {
        token.active = false;
        return token;
      }

      const now = Date.now();
      if (
        !token.sessionStartedAt ||
        now - token.sessionStartedAt > absoluteSessionMs ||
        !token.lastActivityAt ||
        now - token.lastActivityAt > idleSessionMs
      ) {
        token.active = false;
        return token;
      }
      token.lastActivityAt = now;

      try {
        const [current, currentSession] = await Promise.all([
          db.user.findUnique({
            where: { id: token.sub },
            select: {
              role: true,
              status: true,
              sessionVersion: true,
              email: true,
              mfaEnabled: true,
              lawyerProfile: { select: { rank: true } },
            },
          }),
          db.userSession.findFirst({
            where: {
              id: token.sessionId,
              userId: token.sub,
              revokedAt: null,
              expiresAt: { gt: new Date(now) },
            },
            select: { id: true },
          }),
        ]);
        const demoBlocked = current?.email
          ? !demoLoginAllowed(current.email)
          : true;
        token.active = Boolean(
          current &&
          current.status === "ACTIVE" &&
          current.sessionVersion === token.sessionVersion &&
          currentSession &&
          !demoBlocked,
        );
        if (
          currentSession &&
          now - (token.sessionLastPersistedAt ?? 0) > 5 * 60 * 1000
        ) {
          await db.userSession.updateMany({
            where: { id: token.sessionId, revokedAt: null },
            data: { lastSeenAt: new Date(now) },
          });
          token.sessionLastPersistedAt = now;
        }
        if (current) {
          const currentRank = current.lawyerProfile?.rank ?? null;
          const currentMfaRequired = false;
          if (current.mfaEnabled !== token.mfaEnabled) {
            token.mfaVerified = false;
          }
          token.role = current.role;
          token.lawyerRank = currentRank;
          token.mfaEnabled = current.mfaEnabled;
          token.mfaRequired = currentMfaRequired;
        }
      } catch {
        token.active = false;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.sub ?? "";
      session.user.email = token.email ?? "";
      session.user.role = token.role ?? "CLIENT";
      session.user.active = token.active === true;
      session.user.sessionVersion = token.sessionVersion ?? 0;
      session.user.lawyerRank = token.lawyerRank ?? null;
      session.user.mfaEnabled = token.mfaEnabled === true;
      session.user.mfaRequired = token.mfaRequired === true;
      session.user.mfaVerified = token.mfaVerified === true;
      session.user.sessionId = token.sessionId ?? "";
      return session;
    },
  },
  events: {
    signOut: async (message) => {
      if (!("token" in message) || !message.token?.sessionId) return;
      await db.userSession
        .updateMany({
          where: { id: message.token.sessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => undefined);
    },
  },
});
