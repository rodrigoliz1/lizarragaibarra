import { auth, signOut } from "@/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.active !== true) {
    redirect("/portal/iniciar-sesion?callbackUrl=%2Fadmin");
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    redirect(
      role === "LAWYER"
        ? "/portal/abogado?aviso=sin-acceso"
        : "/portal/panel?aviso=sin-acceso",
    );
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/portal/iniciar-sesion" });
  }

  return (
    <AdminShell
      userName={session.user.name || "Administración LI"}
      userEmail={session.user.email || "Cuenta administrativa"}
      signOutAction={signOutAction}
    >
      {children}
    </AdminShell>
  );
}
