import { describe, expect, it } from "vitest";

import {
  canAccessMatter,
  canManageFirmSettings,
  canApproveArticle,
  canPublishArticle,
  canManageAppointment,
  canManageAvailability,
  canManageMatter,
  hasPermission,
  canSeeInternalContent,
  canSeeRestrictedInternalContent,
  type PolicyActor,
} from "@/server/policies/rules";

const matter = { clientId: "client-a", assignedLawyerIds: ["lawyer-a"] };

describe("políticas de autorización", () => {
  it("permite al cliente únicamente su propio asunto", () => {
    const owner: PolicyActor = {
      id: "u1",
      role: "CLIENT",
      clientProfileId: "client-a",
    };
    const outsider: PolicyActor = {
      id: "u2",
      role: "CLIENT",
      clientProfileId: "client-b",
    };
    expect(canAccessMatter(owner, matter)).toBe(true);
    expect(canAccessMatter(outsider, matter)).toBe(false);
    expect(canSeeInternalContent(owner)).toBe(false);
  });

  it("separa rango profesional del rol técnico", () => {
    const partner: PolicyActor = {
      id: "partner",
      role: "LAWYER",
      lawyerRank: "PARTNER",
      lawyerProfileId: "lawyer-partner",
    };
    const associate: PolicyActor = {
      id: "associate",
      role: "LAWYER",
      lawyerRank: "ASSOCIATE",
      lawyerProfileId: "lawyer-associate",
    };
    expect(hasPermission(partner, "CREATE_CLIENT")).toBe(true);
    expect(hasPermission(partner, "CREATE_ASSOCIATE")).toBe(true);
    expect(canApproveArticle(partner)).toBe(true);
    expect(canPublishArticle(partner)).toBe(true);
    expect(canSeeRestrictedInternalContent(partner)).toBe(true);
    expect(hasPermission(associate, "CREATE_CLIENT")).toBe(false);
    expect(canApproveArticle(associate)).toBe(false);
    expect(canPublishArticle(associate)).toBe(false);
    expect(canSeeRestrictedInternalContent(associate)).toBe(false);
  });

  it("permite al abogado asignado, pero no a otro abogado", () => {
    expect(
      canAccessMatter(
        { id: "u3", role: "LAWYER", lawyerProfileId: "lawyer-a" },
        matter,
      ),
    ).toBe(true);
    expect(
      canAccessMatter(
        { id: "u4", role: "LAWYER", lawyerProfileId: "lawyer-b" },
        matter,
      ),
    ).toBe(false);
  });

  it("reserva la configuración institucional para ADMIN", () => {
    const admin: PolicyActor = { id: "u5", role: "ADMIN" };
    const lawyer: PolicyActor = {
      id: "u6",
      role: "LAWYER",
      lawyerProfileId: "lawyer-a",
    };
    expect(canAccessMatter(admin, matter)).toBe(true);
    expect(canSeeInternalContent(admin)).toBe(true);
    expect(canSeeRestrictedInternalContent(admin)).toBe(true);
    expect(canManageFirmSettings(admin)).toBe(true);
    expect(canManageFirmSettings(lawyer)).toBe(false);
  });

  it("impide que asociado y cliente creen asuntos o administren usuarios", () => {
    const associate: PolicyActor = {
      id: "associate",
      role: "LAWYER",
      lawyerRank: "ASSOCIATE",
      lawyerProfileId: "lawyer-associate",
    };
    const client: PolicyActor = {
      id: "client",
      role: "CLIENT",
      clientProfileId: "client-a",
    };
    expect(canManageMatter(associate)).toBe(false);
    expect(hasPermission(associate, "MANAGE_USERS")).toBe(false);
    expect(canManageAppointment(associate)).toBe(true);
    expect(canManageAvailability(associate)).toBe(true);
    expect(canManageMatter(client)).toBe(false);
    expect(canManageAppointment(client)).toBe(false);
  });

  it("permite al socio abrir asuntos pero nunca crear ADMIN u otros socios", () => {
    const partner: PolicyActor = {
      id: "partner",
      role: "LAWYER",
      lawyerRank: "PARTNER",
      lawyerProfileId: "lawyer-partner",
    };
    expect(canManageMatter(partner)).toBe(true);
    expect(hasPermission(partner, "CREATE_CLIENT")).toBe(true);
    expect(hasPermission(partner, "CREATE_ASSOCIATE")).toBe(true);
    expect(hasPermission(partner, "CREATE_PARTNER")).toBe(false);
    expect(hasPermission(partner, "MANAGE_USERS")).toBe(false);
  });
});
