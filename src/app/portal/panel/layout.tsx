import { auth, signOut } from "@/auth";
import { PortalShell } from "@/components/portal/portal-shell";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Portal privado",
  robots: { index: false, follow: false },
};

export default async function PortalPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.active !== true) {
    redirect("/portal/iniciar-sesion?callbackUrl=%2Fportal%2Fpanel");
  }
  if (session.user.role === "LAWYER") redirect("/portal/abogado");
  if (session.user.role === "ADMIN") redirect("/admin");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/portal" });
  }

  const unreadNotifications = await db.notification.count({
    where: { recipientId: session.user.id, readAt: null },
  });

  return (
    <PortalShell
      userName={session.user.name || "Cliente LI"}
      userEmail={session.user.email || "Cuenta privada"}
      userRole={session.user.role}
      unreadNotifications={unreadNotifications}
      signOutAction={signOutAction}
    >
      {children}
    </PortalShell>
  );
}
