"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  ContactRound,
  FileText,
  GalleryHorizontal,
  Gauge,
  Gift,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Scissors,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";

export type PortalRole = "client" | "barber" | "reception" | "admin";

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };

const nav: Record<PortalRole, NavItem[]> = {
  client: [
    { label: "Dashboard", href: "/client", icon: LayoutDashboard },
    { label: "Appointments", href: "/client/appointments", icon: CalendarDays },
    { label: "Rebook", href: "/client/rebook", icon: Clock3 },
    { label: "Queue", href: "/client/queue", icon: ClipboardList },
    { label: "Membership", href: "/client/membership", icon: WalletCards },
    { label: "Rewards", href: "/client/rewards", icon: Gift },
    { label: "Grooming profile", href: "/client/grooming-profile", icon: Scissors },
    { label: "Notifications", href: "/client/notifications", icon: Bell },
    { label: "Feedback", href: "/client/feedback", icon: MessageSquareText },
    { label: "Account", href: "/client/account", icon: Settings },
  ],
  barber: [
    { label: "Dashboard", href: "/barber", icon: LayoutDashboard },
    { label: "Today", href: "/barber/today", icon: Clock3 },
    { label: "Calendar", href: "/barber/calendar", icon: CalendarDays },
    { label: "Queue", href: "/barber/queue", icon: ClipboardList },
    { label: "Clients", href: "/barber/clients", icon: ContactRound },
    { label: "Attribution claims", href: "/barber/attribution", icon: FileText },
    { label: "Portfolio", href: "/barber/portfolio", icon: GalleryHorizontal },
    { label: "Performance", href: "/barber/performance", icon: BarChart3 },
    { label: "Commissions", href: "/barber/commissions", icon: CircleDollarSign },
    { label: "Disputes", href: "/barber/disputes", icon: FileText },
    { label: "Profile", href: "/barber/profile", icon: Settings },
  ],
  reception: [
    { label: "Dashboard", href: "/reception", icon: LayoutDashboard },
    { label: "Schedule", href: "/reception/schedule", icon: CalendarDays },
    { label: "Queue", href: "/reception/queue", icon: ClipboardList },
    { label: "Client lookup", href: "/reception/clients", icon: ContactRound },
    { label: "Check-in", href: "/reception/check-in", icon: ShieldCheck },
    { label: "Communications", href: "/reception/messages", icon: MessageSquareText },
    { label: "Kiosk control", href: "/reception/kiosk", icon: Gauge },
  ],
  admin: [
    { label: "Executive", href: "/admin", icon: LayoutDashboard },
    { label: "Operations", href: "/admin/operations", icon: Gauge },
    { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
    { label: "Queue", href: "/admin/queue", icon: ClipboardList },
    { label: "Clients", href: "/admin/clients", icon: ContactRound },
    { label: "Barbers", href: "/admin/barbers", icon: Scissors },
    { label: "Services", href: "/admin/services", icon: Sparkles },
    { label: "Memberships", href: "/admin/memberships", icon: WalletCards },
    { label: "Content", href: "/admin/content", icon: FileText },
    { label: "Marketing", href: "/admin/marketing", icon: HeartHandshake },
    { label: "Automations", href: "/admin/automations", icon: Bell },
    { label: "Attribution", href: "/admin/attribution", icon: FileText },
    { label: "Commissions", href: "/admin/commissions", icon: CircleDollarSign },
    { label: "Policy approvals", href: "/admin/policies", icon: ShieldCheck },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Integrations", href: "/admin/integrations", icon: ShieldCheck },
    { label: "Users & roles", href: "/admin/users", icon: UsersRound },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
};

const roleCopy: Record<PortalRole, { label: string; description: string }> = {
  client: { label: "Client portal", description: "Appointments, grooming preferences, and account controls" },
  barber: { label: "Barber workspace", description: "Schedule, clients, performance, and statements" },
  reception: { label: "Reception console", description: "Today’s floor, queue, and client check-in" },
  admin: { label: "Owner & admin", description: "Daily operations, people, automation, and shop controls" },
};

const barberResponsiveCss = `
  .barber-portal-shell .barber-mobile-nav-header { display: none; }
  .barber-portal-shell .portal-main,
  .barber-portal-shell .portal-card,
  .barber-portal-shell form,
  .barber-portal-shell label { min-width: 0; max-width: 100%; }
  .barber-portal-shell .portal-main { width: 100%; overflow-wrap: anywhere; }
  .barber-portal-shell .portal-table-wrap {
    width: 100%;
    max-width: 100%;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
  }
  .barber-portal-shell input,
  .barber-portal-shell select,
  .barber-portal-shell textarea { max-width: 100%; }

  @media (min-width: 1024px) and (max-width: 1279px) {
    .barber-portal-shell .portal-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    .barber-portal-shell .portal-grid > .col-span-3 {
      grid-column: span 1 / span 1 !important;
    }
  }

  @media (max-width: 1023px) {
    .barber-portal-shell {
      grid-template-columns: minmax(0, 1fr) !important;
    }
    .barber-portal-shell .portal-sidebar {
      position: relative !important;
      top: auto !important;
      height: auto !important;
      width: 100% !important;
      overflow: visible !important;
      display: block !important;
      padding: .75rem 1rem !important;
      border-right: 0 !important;
      border-bottom: 1px solid var(--color-ink-line) !important;
      background: rgba(13, 13, 13, .98) !important;
    }
    .barber-portal-shell .portal-sidebar-brand { display: none !important; }
    .barber-portal-shell .barber-mobile-nav-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      min-height: 52px;
    }
    .barber-portal-shell .portal-role-nav,
    .barber-portal-shell .portal-sidebar-footer { display: none !important; }
    .barber-portal-shell .portal-sidebar[data-mobile-open="true"] .portal-role-nav {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: .45rem;
      margin-top: .7rem;
      padding-top: .7rem;
      border-top: 1px solid var(--color-ink-line);
    }
    .barber-portal-shell .portal-sidebar[data-mobile-open="true"] .portal-sidebar-footer {
      display: flex !important;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: .65rem 1rem;
      margin-top: .75rem !important;
      padding-top: .75rem !important;
      border-top: 1px solid var(--color-ink-line) !important;
    }
    .barber-portal-shell .portal-sidebar-footer > label {
      flex: 1 1 15rem;
    }
    .barber-portal-shell .portal-sidebar-footer > p {
      flex: 1 1 100%;
      margin-top: 0 !important;
    }
    .barber-portal-shell .portal-sidebar-footer > div,
    .barber-portal-shell .portal-sidebar-footer > button {
      margin-top: 0 !important;
    }
    .barber-portal-shell .portal-nav-link {
      width: 100%;
      min-height: 46px;
      padding: .72rem .8rem;
      white-space: normal !important;
      border: 1px solid transparent;
    }
    .barber-portal-shell .portal-nav-link[data-active="true"] {
      border-color: color-mix(in srgb, var(--color-brass) 32%, transparent);
    }
    .barber-portal-shell .portal-main {
      padding: 1.5rem clamp(.9rem, 3vw, 1.5rem) 4.5rem !important;
    }
    .barber-portal-shell .portal-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    .barber-portal-shell .portal-grid > * {
      grid-column: span 1 / span 1 !important;
    }
  }

  @media (max-width: 639px) {
    .barber-portal-shell .portal-sidebar { padding: .6rem .75rem !important; }
    .barber-portal-shell .portal-sidebar[data-mobile-open="true"] .portal-role-nav {
      grid-template-columns: minmax(0, 1fr);
    }
    .barber-portal-shell .portal-sidebar[data-mobile-open="true"] .portal-sidebar-footer {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr);
      align-items: stretch;
    }
    .barber-portal-shell .portal-sidebar-footer > div,
    .barber-portal-shell .portal-sidebar-footer > button,
    .barber-portal-shell .portal-sidebar-footer .form-control {
      width: 100%;
    }
    .barber-portal-shell .portal-main {
      padding: 1rem .75rem 4.5rem !important;
    }
    .barber-portal-shell .portal-main header {
      margin-bottom: 1.5rem;
    }
    .barber-portal-shell .portal-main header h1 {
      font-size: clamp(2rem, 10vw, 2.75rem) !important;
      line-height: 1.02 !important;
    }
    .barber-portal-shell .portal-grid {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: .75rem !important;
    }
    .barber-portal-shell .portal-grid > * {
      grid-column: 1 / -1 !important;
    }
    .barber-portal-shell .portal-card {
      padding: 1rem !important;
      border-radius: .8rem !important;
    }
    .barber-portal-shell .portal-card > .flex {
      flex-wrap: wrap;
    }
    .barber-portal-shell .portal-table-wrap {
      border-radius: .7rem;
    }
    .barber-portal-shell .portal-table {
      min-width: 100% !important;
      font-size: .72rem !important;
    }
    .barber-portal-shell .portal-table:has(th:nth-child(5)) {
      min-width: 620px !important;
    }
    .barber-portal-shell .portal-table:has(th:nth-child(7)) {
      min-width: 760px !important;
    }
    .barber-portal-shell .portal-table th,
    .barber-portal-shell .portal-table td {
      padding: .65rem .7rem !important;
    }
    .barber-portal-shell .portal-main .min-w-64 {
      min-width: 0 !important;
      width: 100% !important;
    }
    .barber-portal-shell .portal-main form > button[type="submit"] {
      width: 100%;
      justify-content: center;
    }
    .barber-portal-shell input[type="file"] {
      width: 100%;
      min-width: 0;
    }
  }
`;

export function PortalShell({ role, children }: { role: PortalRole; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<{ email: string | null; roles: string[]; activeRole: string | null } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" }).then((response) => response.json()).then((value) => { if (active) setSession(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function switchRole(nextRole: string) {
    const response = await fetch("/api/auth/switch-role", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: nextRole }) });
    const result = await response.json() as { destination?: string };
    if (response.ok && result.destination) { router.push(result.destination); router.refresh(); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const currentItem = nav[role].find((item) => item.href === `/${role}` ? pathname === item.href : pathname.startsWith(item.href)) ?? nav[role][0];
  const isBarber = role === "barber";

  return (
    <div className={`portal-shell${isBarber ? " barber-portal-shell" : ""}`} data-portal-role={role}>
      {isBarber ? <style>{barberResponsiveCss}</style> : null}
      <aside className="portal-sidebar" data-mobile-open={isBarber ? mobileNavOpen : undefined} aria-label={`${roleCopy[role].label} navigation`}>
        {isBarber ? (
          <div className="barber-mobile-nav-header">
            <div className="min-w-0">
              <p className="text-[9px] tracking-[.2em] uppercase text-[var(--color-brass)]">Barber workspace</p>
              <p className="mt-1 truncate text-sm font-medium text-[var(--color-bone)]">{currentItem.label}</p>
            </div>
            <button
              type="button"
              aria-expanded={mobileNavOpen}
              aria-controls="barber-portal-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 text-[10px] tracking-[.14em] uppercase text-[var(--color-bone)]"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              {mobileNavOpen ? "Close" : "Menu"}
            </button>
          </div>
        ) : null}

        <div className="portal-sidebar-brand mb-7 border-b border-[var(--color-ink-line)] pb-6">
          <Logo compact />
          <p className="mt-4 text-[10px] tracking-[.25em] uppercase text-[var(--color-brass)]">{roleCopy[role].label}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--color-bone-muted)]">{roleCopy[role].description}</p>
        </div>
        <nav id={isBarber ? "barber-portal-navigation" : undefined} className="portal-role-nav space-y-1">
          {nav[role].map((item) => {
            const active = item.href === `/${role}` ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} data-active={active} className="portal-nav-link"><Icon className="h-4 w-4 shrink-0" /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="portal-sidebar-footer mt-7 border-t border-[var(--color-ink-line)] pt-5">
          {session?.roles && session.roles.length > 1 ? (
            <label className="block text-[9px] tracking-[.2em] uppercase text-[var(--color-bone-muted)]">Active workspace
              <select value={session.activeRole ?? ""} onChange={(event) => switchRole(event.target.value)} className="form-control mt-2 text-xs normal-case tracking-normal">
                {session.roles.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
              </select>
            </label>
          ) : null}
          {session?.email ? <p className="mt-4 truncate text-[10px] text-[var(--color-bone-muted)]">{session.email}</p> : null}
          <div className="mt-4"><LanguageToggle className="w-full justify-center" /></div><button type="button" onClick={logout} className="mt-3 inline-flex items-center gap-2 text-[10px] tracking-[.18em] uppercase text-[var(--color-bone-muted)] hover:text-[var(--color-brass)]"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      <main className="portal-main">{children}</main>
    </div>
  );
}
