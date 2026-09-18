import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { PortalShell } from "@/components/portal/portal-shell";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Portal profesional",
  robots: { index: false, follow: false },
};

export default async function LawyerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || !session.user.active)
    redirect("/portal/iniciar-sesion?callbackUrl=%2Fportal%2Fabogado");
  if (session.user.role !== "LAWYER")
    redirect(
      session.user.role === "ADMIN"
        ? "/admin"
        : "/portal/panel?aviso=sin-acceso",
    );
  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/portal/iniciar-sesion" });
  }
  const unreadNotifications = await db.notification.count({
    where: { recipientId: session.user.id, readAt: null },
  });
  return (
    <PortalShell
      userName={session.user.name || "Profesional LI"}
      userEmail={session.user.email}
      userRole="LAWYER"
      unreadNotifications={unreadNotifications}
      signOutAction={signOutAction}
    >
      {children}
    </PortalShell>
  );
}
