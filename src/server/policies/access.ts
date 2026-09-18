import type { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  AccessDeniedError,
  AuthenticationRequiredError,
} from "@/server/services/errors";
import type { PolicyActor } from "@/server/policies/rules";

export async function requireActor(allowedRoles?: PolicyActor["role"][]) {
  const session = await auth();
  if (!session?.user?.id || !session.user.active)
    throw new AuthenticationRequiredError();
  const user = await db.user.findFirst({
    where: { id: session.user.id, status: "ACTIVE" },
    select: {
      id: true,
      role: true,
      clientProfile: { select: { id: true } },
      lawyerProfile: { select: { id: true, active: true, rank: true } },
    },
  });
  if (!user) throw new AuthenticationRequiredError();
  if (allowedRoles && !allowedRoles.includes(user.role))
    throw new AccessDeniedError();

  return {
    id: user.id,
    role: user.role,
    clientProfileId: user.clientProfile?.id ?? null,
    lawyerProfileId: user.lawyerProfile?.id ?? null,
    lawyerRank: user.lawyerProfile?.rank ?? null,
  } satisfies PolicyActor;
}

export const requireAuthenticatedUser = () => requireActor();
export const requireAdmin = () => requireActor(["ADMIN"]);
export const requireLawyer = () => requireActor(["LAWYER", "ADMIN"]);
export const requireClient = () => requireActor(["CLIENT"]);

export async function requirePartner() {
  const actor = await requireActor(["LAWYER", "ADMIN"]);
  if (actor.role !== "ADMIN" && actor.lawyerRank !== "PARTNER") {
    throw new AccessDeniedError();
  }
  return actor;
}

export function matterWhereForActor(
  actor: PolicyActor,
): Prisma.MatterWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "CLIENT") {
    return actor.clientProfileId
      ? { clientId: actor.clientProfileId }
      : { id: "__none__" };
  }
  return actor.lawyerProfileId
    ? { assignments: { some: { lawyerId: actor.lawyerProfileId } } }
    : { id: "__none__" };
}

export async function requireMatterAccess(
  matterId: string,
  actor?: PolicyActor,
) {
  const currentActor = actor ?? (await requireActor());
  const matter = await db.matter.findFirst({
    where: { id: matterId, ...matterWhereForActor(currentActor) },
    select: { id: true },
  });
  if (!matter) throw new AccessDeniedError();
  return currentActor;
}
