import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { PortalShell } from "@/components/portal/portal-shell";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Portal de socio",
  robots: { index: false, follow: false },
};
export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (
    !session?.user.active ||
    session.user.role !== "LAWYER" ||
    session.user.lawyerRank !== "PARTNER"
  )
    redirect("/portal/abogado?aviso=sin-acceso");
  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/portal/iniciar-sesion" });
  }
  const unreadNotifications = await db.notification.count({
    where: { recipientId: session.user.id, readAt: null },
  });
  return (
    <PortalShell
      userName={session.user.name || "Socio LI"}
      userEmail={session.user.email}
      userRole="LAWYER"
      unreadNotifications={unreadNotifications}
      signOutAction={signOutAction}
    >
      {children}
    </PortalShell>
  );
}
