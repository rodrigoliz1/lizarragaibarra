"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  BookOpenText,
  Bell,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useMobileNavigationDialog } from "@/components/layout/use-mobile-navigation-dialog";

type PortalUserRole = "CLIENT" | "LAWYER" | "ADMIN";

type PortalNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: PortalUserRole[];
};

const navigation: PortalNavigationItem[] = [
  { href: "/portal/panel", label: "Resumen", icon: LayoutDashboard },
  { href: "/portal/panel/asuntos", label: "Asuntos", icon: BriefcaseBusiness },
  { href: "/portal/panel/actividad", label: "Actividad", icon: Clock3 },
  { href: "/portal/panel/citas", label: "Citas", icon: CalendarDays },
  { href: "/portal/panel/documentos", label: "Documentos", icon: FileText },
  {
    href: "/portal/panel/mensajes",
    label: "Mensajes",
    icon: MessageSquareText,
  },
  {
    href: "/portal/panel/perfil",
    label: "Mi perfil",
    icon: UserRound,
    roles: ["CLIENT"],
  },
  {
    href: "/portal/seguridad/contrasena",
    label: "Seguridad",
    icon: ShieldCheck,
  },
  {
    href: "/portal/seguridad/mfa",
    label: "App autenticadora",
    icon: ShieldCheck,
  },
];

const lawyerNavigation: PortalNavigationItem[] = [
  { href: "/portal/abogado", label: "Resumen", icon: LayoutDashboard },
  {
    href: "/portal/abogado/asuntos",
    label: "Asuntos",
    icon: BriefcaseBusiness,
  },
  { href: "/portal/abogado/citas", label: "Citas", icon: CalendarDays },
  {
    href: "/portal/abogado/disponibilidad",
    label: "Disponibilidad",
    icon: CalendarRange,
  },
  {
    href: "/portal/abogado/mensajes",
    label: "Mensajes",
    icon: MessageSquareText,
  },
  { href: "/portal/abogado/articulos", label: "Artículos", icon: BookOpenText },
  { href: "/portal/abogado/perfil", label: "Mi perfil", icon: UserRound },
  {
    href: "/portal/seguridad/sesiones",
    label: "Seguridad",
    icon: ShieldCheck,
  },
  {
    href: "/portal/seguridad/mfa",
    label: "App autenticadora",
    icon: ShieldCheck,
  },
];

type PortalShellProps = {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userRole: PortalUserRole;
  signOutAction: () => Promise<void>;
  unreadNotifications?: number;
};

export function PortalShell({
  children,
  userName,
  userEmail,
  userRole,
  signOutAction,
  unreadNotifications = 0,
}: PortalShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dialogRef, triggerRef } = useMobileNavigationDialog(
    mobileOpen,
    setMobileOpen,
  );
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[286px] flex-col border-r border-white/10 bg-[#0b0b0b] lg:flex">
        <SidebarContent
          pathname={pathname}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          initials={initials}
          signOutAction={signOutAction}
        />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#080808]/90 px-4 backdrop-blur-xl lg:hidden">
        <Link
          href={userRole === "LAWYER" ? "/portal/abogado" : "/portal/panel"}
          className="flex items-center gap-3"
          aria-label="Lizárraga & Ibarra Abogados · Portal"
        >
          <span className="font-serif text-2xl tracking-[-0.06em]">LI</span>
          <span className="h-5 w-px bg-white/20" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/55">
            Portal
          </span>
        </Link>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid size-10 place-items-center rounded-full border border-white/15 text-white"
          aria-controls="portal-mobile-menu"
          aria-label="Abrir menú del portal"
          aria-expanded={mobileOpen}
        >
          <Menu size={18} aria-hidden="true" />
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={dialogRef}
            aria-label="Menú del portal"
            aria-modal="true"
            className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col border-r border-white/10 bg-[#0b0b0b] shadow-2xl"
            id="portal-mobile-menu"
            role="dialog"
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full border border-white/15 text-white/70"
              aria-label="Cerrar menú"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <SidebarContent
              pathname={pathname}
              userName={userName}
              userEmail={userEmail}
              userRole={userRole}
              initials={initials}
              signOutAction={signOutAction}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <main className="lg:pl-[286px]">
        <div className="mx-auto min-h-screen w-full max-w-[1500px] px-4 py-7 sm:px-7 sm:py-10 xl:px-12">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-white/40">
              <ShieldCheck
                size={15}
                className="text-[#d3d3d0]"
                aria-hidden="true"
              />
              <span>Sesión privada protegida</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={
                  userRole === "LAWYER"
                    ? "/portal/abogado/notificaciones"
                    : "/portal/panel/notificaciones"
                }
                className="relative grid size-9 place-items-center rounded-full border border-white/10 text-white/55"
                aria-label={`${unreadNotifications} notificaciones sin leer`}
              >
                <Bell className="size-4" aria-hidden="true" />
                {unreadNotifications ? (
                  <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-white px-1 text-[8px] font-bold text-black">
                    {Math.min(99, unreadNotifications)}
                  </span>
                ) : null}
              </Link>
              <span className="hidden items-center rounded-full border border-[#d3d3d0]/35 bg-[#d3d3d0]/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.22em] text-[#f7f7f5] sm:inline-flex">
                Acceso verificado
              </span>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({
  pathname,
  userName,
  userEmail,
  userRole,
  initials,
  signOutAction,
  onNavigate,
}: {
  pathname: string;
  userName: string;
  userEmail: string;
  userRole: PortalUserRole;
  initials: string;
  signOutAction: () => Promise<void>;
  onNavigate?: () => void;
}) {
  const navigationItems = userRole === "LAWYER" ? lawyerNavigation : navigation;
  const portalLabel =
    userRole === "LAWYER" ? "Portal profesional" : "Portal de clientes";
  return (
    <>
      <div className="border-b border-white/10 px-7 py-7">
        <Link
          href="/"
          className="inline-flex items-center gap-4"
          onClick={onNavigate}
        >
          <span className="font-serif text-4xl tracking-[-0.07em]">LI</span>
          <span className="h-8 w-px bg-white/20" />
          <span className="text-[9px] font-semibold uppercase leading-4 tracking-[0.25em] text-white/50">
            {portalLabel}
          </span>
        </Link>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-4 py-6"
        aria-label="Navegación del portal"
      >
        <p className="px-3 pb-3 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/30">
          {userRole === "LAWYER"
            ? "Operación profesional"
            : "Expediente digital"}
        </p>
        <ul className="space-y-1">
          {navigationItems
            .filter((item) => !item.roles || item.roles.includes(userRole))
            .map((item) => {
              const isActive =
                item.href === "/portal/panel" || item.href === "/portal/abogado"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                      isActive
                        ? "bg-white/[0.08] text-white"
                        : "text-white/50 hover:bg-white/[0.045] hover:text-white/80"
                    }`}
                  >
                    <Icon
                      size={17}
                      strokeWidth={isActive ? 1.9 : 1.5}
                      className={isActive ? "text-[#d3d3d0]" : "text-white/35"}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{item.label}</span>
                    {isActive ? (
                      <ChevronRight
                        size={14}
                        className="text-white/35"
                        aria-hidden="true"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          href={
            userRole === "CLIENT"
              ? "/portal/panel/perfil"
              : userRole === "ADMIN"
                ? "/admin"
                : "/portal/abogado"
          }
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.04]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#d3d3d0]/35 bg-[#d3d3d0]/10 text-xs font-semibold text-[#f7f7f5]">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-white/85">
              {userName}
            </span>
            <span className="block truncate text-[10px] text-white/35">
              {userEmail}
            </span>
          </span>
        </Link>
        <form action={signOutAction} className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/75"
          >
            <LogOut size={15} aria-hidden="true" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );
}
