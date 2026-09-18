import { describe, expect, it } from "vitest";

import {
  appointmentProposalSideForActor,
  canRespondToAppointmentProposal,
  type PolicyActor,
} from "@/server/policies/rules";

const actors = {
  client: { id: "client", role: "CLIENT" },
  otherClient: { id: "other-client", role: "CLIENT" },
  lawyer: { id: "lawyer", role: "LAWYER" },
  otherLawyer: { id: "other-lawyer", role: "LAWYER" },
  admin: { id: "admin", role: "ADMIN" },
} satisfies Record<string, PolicyActor>;

describe("autorización bilateral de propuestas de cita", () => {
  it("clasifica clientes y personal del despacho por lado", () => {
    expect(appointmentProposalSideForActor(actors.client)).toBe("CLIENT");
    expect(appointmentProposalSideForActor(actors.lawyer)).toBe("FIRM");
    expect(appointmentProposalSideForActor(actors.admin)).toBe("FIRM");
  });

  it("solo permite responder al lado opuesto de una propuesta del cliente", () => {
    expect(canRespondToAppointmentProposal(actors.client, "CLIENT")).toBe(
      false,
    );
    expect(canRespondToAppointmentProposal(actors.otherClient, "CLIENT")).toBe(
      false,
    );
    expect(canRespondToAppointmentProposal(actors.lawyer, "CLIENT")).toBe(true);
    expect(canRespondToAppointmentProposal(actors.admin, "CLIENT")).toBe(true);
  });

  it("solo permite responder al lado cliente una propuesta de la firma", () => {
    expect(canRespondToAppointmentProposal(actors.client, "FIRM")).toBe(true);
    expect(canRespondToAppointmentProposal(actors.lawyer, "FIRM")).toBe(false);
    expect(canRespondToAppointmentProposal(actors.otherLawyer, "FIRM")).toBe(
      false,
    );
    expect(canRespondToAppointmentProposal(actors.admin, "FIRM")).toBe(false);
  });
});
