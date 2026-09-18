"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { invitedAccountSchema, userStatusSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/policies";
import {
  changeUserStatus,
  createInvitedAccount,
  resendAccountInvitation,
  revokeAccountInvitation,
} from "@/server/services/account-service";

export async function createUserAction(formData: FormData) {
  const actor = await requireAdmin();
  const role = String(formData.get("role") || "CLIENT");
  const parsed = invitedAccountSchema.parse({
    role,
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || "",
    company: formData.get("company") || undefined,
    rank: role === "LAWYER" ? formData.get("rank") : undefined,
    position: formData.get("position") || undefined,
    slug: role === "LAWYER" ? formData.get("slug") : undefined,
    bio: formData.get("bio") || "",
    education: formData.get("education") || "",
    practiceAreaIds: formData.getAll("practiceAreaIds"),
    publicProfile: formData.get("publicProfile") === "on",
    sendInvite: formData.get("sendInvite") === "on",
  });
  await createInvitedAccount(actor, parsed);
  redirect("/admin/usuarios?creado=1");
}

export async function changeUserStatusAction(formData: FormData) {
  const actor = await requireAdmin();
  const userId = String(formData.get("userId"));
  const { status } = userStatusSchema.parse({ status: formData.get("status") });
  await changeUserStatus(actor, userId, status);
  revalidatePath("/admin/usuarios");
}

export async function resendInvitationAction(formData: FormData) {
  const actor = await requireAdmin();
  await resendAccountInvitation(actor, String(formData.get("userId")));
  revalidatePath("/admin/usuarios");
}

export async function revokeInvitationAction(formData: FormData) {
  const actor = await requireAdmin();
  await revokeAccountInvitation(actor, String(formData.get("userId")));
  revalidatePath("/admin/usuarios");
}
