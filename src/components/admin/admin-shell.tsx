"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MailWarning,
  MessageSquareText,
  Menu,
  Settings2,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useMobileNavigationDialog } from "@/components/layout/use-mobile-navigation-dialog";

const navigation = [
  { href: "/admin", label: "Visión general", icon: LayoutDashboard },
  { href: "/admin/citas", label: "Citas", icon: CalendarCheck2 },
  {
    href: "/admin/disponibilidad",
    label: "Disponibilidad",
    icon: CalendarRange,
  },
  { href: "/admin/clientes", label: "Clientes", icon: UsersRound },
  { href: "/admin/usuarios", label: "Usuarios", icon: ShieldCheck },
  { href: "/admin/abogados", label: "Abogados y socios", icon: UserRoundCog },
  { href: "/admin/asuntos", label: "Asuntos", icon: BriefcaseBusiness },
  { href: "/admin/mensajes", label: "Mensajes", icon: MessageSquareText },
  { href: "/admin/documentos", label: "Documentos", icon: ClipboardList },
  { href: "/admin/media", label: "Biblioteca media", icon: BookOpenText },
  { href: "/admin/casos", label: "Casos de éxito", icon: BriefcaseBusiness },
  { href: "/admin/equipo", label: "Equipo", icon: UserRoundCog },
  { href: "/admin/articulos", label: "Insights", icon: BookOpenText },
  { href: "/admin/formularios", label: "Contactos", icon: ClipboardList },
  { href: "/admin/correos", label: "Correos", icon: MailWarning },
  { href: "/admin/auditoria", label: "Auditoría", icon: ShieldCheck },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings2 },
  {
    href: "/portal/seguridad/sesiones",
    label: "Seguridad de cuenta",
    icon: ShieldCheck,
  },
  {
    href: "/portal/seguridad/mfa",
    label: "App autenticadora",
    icon: ShieldCheck,
  },
];

export function AdminShell({
  children,
  userName,
  userEmail,
  signOutAction,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dialogRef, triggerRef } = useMobileNavigationDialog(
    mobileOpen,
    setMobileOpen,
  );

  return (
    <div className="min-h-screen bg-[#f3f1ed] text-[#151515]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[292px] flex-col border-r border-black/10 bg-[#0b0b0b] text-white lg:flex">
        <AdminSidebar
          pathname={pathname}
          userName={userName}
          userEmail={userEmail}
          signOutAction={signOutAction}
        />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/10 bg-[#f3f1ed]/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="font-serif text-2xl tracking-[-0.06em]">LI</span>
          <span className="h-5 w-px bg-black/20" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/50">
            Administración
          </span>
        </Link>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid size-10 place-items-center rounded-full border border-black/15"
          aria-label="Abrir menú de administración"
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-navigation"
        >
          <Menu size={18} aria-hidden="true" />
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside
            ref={dialogRef}
            aria-label="Navegación administrativa"
            aria-modal="true"
            className="absolute inset-y-0 left-0 flex w-[min(88vw,330px)] flex-col bg-[#0b0b0b] text-white shadow-2xl"
            id="admin-mobile-navigation"
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
            <AdminSidebar
              pathname={pathname}
              userName={userName}
              userEmail={userEmail}
              signOutAction={signOutAction}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <main className="lg:pl-[292px]">
        <div className="mx-auto min-h-screen w-full max-w-[1560px] px-4 py-7 sm:px-7 sm:py-10 xl:px-12">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
              <ShieldCheck
                size={14}
                className="text-[#8b8b87]"
                aria-hidden="true"
              />
              Área administrativa protegida
            </div>
            <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-black/45">
              Acceso verificado
            </span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function AdminSidebar({
  pathname,
  userName,
  userEmail,
  signOutAction,
  onNavigate,
}: {
  pathname: string;
  userName: string;
  userEmail: string;
  signOutAction: () => Promise<void>;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="border-b border-white/10 px-7 py-7">
        <Link
          href="/"
          onClick={onNavigate}
          className="inline-flex items-center gap-4"
        >
          <span className="font-serif text-4xl tracking-[-0.07em]">LI</span>
          <span className="h-8 w-px bg-white/20" />
          <span className="text-[9px] font-semibold uppercase leading-4 tracking-[0.23em] text-white/50">
            Centro de
            <br /> control
          </span>
        </Link>
      </div>
      <nav
        className="flex-1 overflow-y-auto px-4 py-5"
        aria-label="Administración"
      >
        <p className="px-3 pb-3 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/30">
          Operación del despacho
        </p>
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-white/[0.09] text-white"
                      : "text-white/45 hover:bg-white/[0.045] hover:text-white/80"
                  }`}
                >
                  <Icon
                    size={16}
                    className={isActive ? "text-[#d3d3d0]" : "text-white/30"}
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive ? (
                    <ChevronRight
                      size={13}
                      className="text-white/30"
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
        <div className="rounded-xl bg-white/[0.035] p-3">
          <p className="truncate text-sm text-white/80">{userName}</p>
          <p className="mt-1 truncate text-[10px] text-white/35">{userEmail}</p>
          <p className="mt-2 inline-flex rounded-full border border-[#d3d3d0]/25 bg-[#d3d3d0]/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-[#f7f7f5]">
            Administrador
          </p>
        </div>
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
