export type PolicyActor = {
  id: string;
  role: "CLIENT" | "LAWYER" | "ADMIN";
  clientProfileId?: string | null;
  lawyerProfileId?: string | null;
  lawyerRank?: "PARTNER" | "ASSOCIATE" | null;
};

export type AppointmentProposalSide = "CLIENT" | "FIRM";

export function appointmentProposalSideForActor(
  actor: Pick<PolicyActor, "role">,
): AppointmentProposalSide {
  return actor.role === "CLIENT" ? "CLIENT" : "FIRM";
}

export function canRespondToAppointmentProposal(
  actor: Pick<PolicyActor, "role">,
  proposerSide: AppointmentProposalSide,
) {
  return appointmentProposalSideForActor(actor) !== proposerSide;
}

export type Permission =
  | "MANAGE_USERS"
  | "CREATE_CLIENT"
  | "CREATE_ASSOCIATE"
  | "CREATE_PARTNER"
  | "MANAGE_MATTER"
  | "PUBLISH_ARTICLE"
  | "APPROVE_ARTICLE"
  | "MANAGE_APPOINTMENT"
  | "MANAGE_AVAILABILITY"
  | "MANAGE_SITE_CONTENT"
  | "VIEW_AUDIT";

export function hasPermission(actor: PolicyActor, permission: Permission) {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "CLIENT") return false;
  const partner = actor.lawyerRank === "PARTNER";
  switch (permission) {
    case "CREATE_CLIENT":
    case "CREATE_ASSOCIATE":
    case "MANAGE_MATTER":
    case "PUBLISH_ARTICLE":
    case "APPROVE_ARTICLE":
      return partner;
    case "MANAGE_APPOINTMENT":
    case "MANAGE_AVAILABILITY":
      return true;
    case "MANAGE_USERS":
    case "CREATE_PARTNER":
    case "MANAGE_SITE_CONTENT":
    case "VIEW_AUDIT":
      return false;
  }
}

export const canManageUsers = (actor: PolicyActor) =>
  hasPermission(actor, "MANAGE_USERS");
export const canManageMatter = (actor: PolicyActor) =>
  hasPermission(actor, "MANAGE_MATTER");
export const canPublishArticle = (actor: PolicyActor) =>
  hasPermission(actor, "PUBLISH_ARTICLE");
export const canApproveArticle = (actor: PolicyActor) =>
  hasPermission(actor, "APPROVE_ARTICLE");
export const canManageAppointment = (actor: PolicyActor) =>
  hasPermission(actor, "MANAGE_APPOINTMENT");
export const canManageAvailability = (actor: PolicyActor) =>
  hasPermission(actor, "MANAGE_AVAILABILITY");
export const canManageSiteContent = (actor: PolicyActor) =>
  hasPermission(actor, "MANAGE_SITE_CONTENT");

export type MatterPolicyResource = {
  clientId: string;
  assignedLawyerIds: string[];
};

export function canAccessMatter(
  actor: PolicyActor,
  matter: MatterPolicyResource,
) {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "CLIENT") {
    return Boolean(
      actor.clientProfileId && actor.clientProfileId === matter.clientId,
    );
  }
  return Boolean(
    actor.lawyerProfileId &&
    matter.assignedLawyerIds.includes(actor.lawyerProfileId),
  );
}

export const canViewMatter = canAccessMatter;

export function canSeeInternalContent(actor: PolicyActor) {
  return actor.role === "ADMIN" || actor.role === "LAWYER";
}

export function canSeeRestrictedInternalContent(actor: PolicyActor) {
  return actor.role === "ADMIN" || actor.lawyerRank === "PARTNER";
}

export function canManageFirmSettings(actor: PolicyActor) {
  return actor.role === "ADMIN";
}
