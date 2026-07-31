"use client";

import Link from "next/link";
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
  MessageSquareText,
  Scissors,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  LogOut,
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

export function PortalShell({ role, children }: { role: PortalRole; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<{ email: string | null; roles: string[]; activeRole: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" }).then((response) => response.json()).then((value) => { if (active) setSession(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

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
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar" aria-label={`${roleCopy[role].label} navigation`}>
        <div className="mb-7 border-b border-[var(--color-ink-line)] pb-6">
          <Logo compact />
          <p className="mt-4 text-[10px] tracking-[.25em] uppercase text-[var(--color-brass)]">{roleCopy[role].label}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--color-bone-muted)]">{roleCopy[role].description}</p>
        </div>
        <nav className="space-y-1">
          {nav[role].map((item) => {
            const active = item.href === `/${role}` ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} data-active={active} className="portal-nav-link"><Icon className="h-4 w-4 shrink-0" /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="mt-7 border-t border-[var(--color-ink-line)] pt-5">
          {session?.roles && session.roles.length > 1 ? (
            <label className="block text-[9px] tracking-[.2em] uppercase text-[var(--color-bone-muted)]">Active workspace
              <select value={session.activeRole ?? ""} onChange={(event) => switchRole(event.target.value)} className="form-control mt-2 text-xs normal-case tracking-normal">
                {session.roles.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
              </select>
            </label>
          ) : null}
          {session?.email ? <p className="mt-4 truncate text-[10px] text-[var(--color-bone-muted)]">{session.email}</p> : null}
          <button type="button" onClick={logout} className="mt-4 inline-flex items-center gap-2 text-[10px] tracking-[.18em] uppercase text-[var(--color-bone-muted)] hover:text-[var(--color-brass)]"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      <main className="portal-main">{children}</main>
    </div>
  );
}
