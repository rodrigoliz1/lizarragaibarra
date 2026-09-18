"use server";

import { redirect } from "next/navigation";

import { invitedAccountSchema } from "@/lib/validation";
import { requirePartner } from "@/server/policies";
import { createInvitedAccount } from "@/server/services/account-service";

export async function partnerCreateAccountAction(formData: FormData) {
  const actor = await requirePartner();
  const role = formData.get("kind") === "associate" ? "LAWYER" : "CLIENT";
  const parsed = invitedAccountSchema.parse({
    role,
    rank: role === "LAWYER" ? "ASSOCIATE" : undefined,
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || "",
    company: formData.get("company") || undefined,
    position:
      role === "LAWYER" ? formData.get("position") || "Asociado" : undefined,
    slug: role === "LAWYER" ? formData.get("slug") : undefined,
    bio: "",
    education: "",
    practiceAreaIds: [],
    publicProfile: false,
    sendInvite: true,
  });
  await createInvitedAccount(actor, parsed);
  redirect("/portal/abogado/usuarios?creado=1");
}
