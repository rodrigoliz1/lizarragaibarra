import { auth } from "@/auth";
import { redirect } from "next/navigation";
export default async function Portal() {
  const session = await auth();
  if (!session?.user.active) redirect("/portal/iniciar-sesion");
  redirect(
    session.user.role === "ADMIN"
      ? "/admin"
      : session.user.role === "LAWYER"
        ? "/portal/abogado"
        : "/portal/panel",
  );
}
