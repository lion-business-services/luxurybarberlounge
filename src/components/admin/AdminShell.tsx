"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarOff,
  CircleDollarSign,
  FileText,
  ClipboardList,
  ContactRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  BadgeCheck,
  ListChecks,
  PlugZap,
  WandSparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import type { AppRole } from "@/lib/supabase/types";
import styles from "./admin-portal.module.css";

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
};

type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Daily operations",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "My Barber Portal", href: "/admin/my-barber", icon: Scissors, ownerOnly: true },
      { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
      { label: "Queue", href: "/admin/queue", icon: ClipboardList },
    ],
  },
  {
    label: "People & offerings",
    items: [
      { label: "Clients", href: "/admin/clients", icon: ContactRound },
      { label: "Barbers", href: "/admin/barbers", icon: Scissors },
      { label: "Availability", href: "/admin/time-off", icon: CalendarOff, ownerOnly: false },
      { label: "Services", href: "/admin/services", icon: ListChecks },
      { label: "Memberships", href: "/admin/memberships", icon: BadgeCheck },
    ],
  },
  {
    label: "Pay",
    items: [
      { label: "Commissions", href: "/admin/commissions", icon: CircleDollarSign, ownerOnly: true },
      { label: "Attribution claims", href: "/admin/attribution", icon: FileText, ownerOnly: true },
    ],
  },
  ...(process.env.NEXT_PUBLIC_SHOW_SYSTEM_TOOLS === "true"
    ? [
        {
          label: "Systems",
          items: [
            { label: "Automations", href: "/admin/automations", icon: WandSparkles, ownerOnly: true },
            { label: "Integrations", href: "/admin/integrations", icon: PlugZap, ownerOnly: true },
          ],
        },
      ]
    : []),
];

function active(pathname: string, href: string) {
  if (href === "/admin") return pathname === href || pathname === "/admin/today";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Navigation({ pathname, owner, onNavigate }: { pathname: string; owner: boolean; onNavigate?: () => void }) {
  return (
    <>
      {groups.map((group) => {
        const items = group.items.filter((item) => owner || !item.ownerOnly);
        if (!items.length) return null;
        return (
          <section key={group.label} className={styles.group}>
            <h2 className={styles.groupLabel}>{group.label}</h2>
            <nav aria-label={group.label}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    data-active={active(pathname, item.href)}
                    className={styles.navLink}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        );
      })}
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((data: { email?: string | null; roles?: AppRole[] }) => {
        if (mounted) {
          setEmail(data.email ?? null);
          setRoles(data.roles ?? []);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [pathname]);

  const owner = useMemo(() => roles.includes("owner") || roles.includes("super_admin"), [roles]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/");
    router.refresh();
  }

  const workspaceLabel = owner ? "Owner dashboard" : "Shop operations";

  return (
    <div className={styles.shell} data-admin-portal>
      <aside className={styles.sidebar} aria-label="Barbershop operations navigation">
        <div className={styles.brand}>
          <Logo compact />
          <p className="mt-3 text-[9px] tracking-[.22em] uppercase text-[var(--color-brass)]">{workspaceLabel}</p>
          <p className="mt-1 truncate text-[10px] text-[var(--color-bone-muted)]">{email ?? "Secure operations"}</p>
        </div>
        <Navigation pathname={pathname} owner={owner} />
        <div className="mt-5 px-1">
          <LanguageToggle className="w-full justify-center" />
        </div>
        <button type="button" onClick={logout} className={`${styles.navLink} mt-3 w-full`}>
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      <div className={styles.mobileBar}>
        <div>
          <p className="text-[9px] tracking-[.2em] uppercase text-[var(--color-brass)]">{workspaceLabel}</p>
          <p className="max-w-[13rem] truncate text-xs text-[var(--color-bone-muted)]">{email ?? "Secure operations"}</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label="Open operations navigation">
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Operations navigation">
          <div className={styles.drawerPanel}>
            <div className="flex items-center justify-between">
              <Logo compact />
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label="Close navigation">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Navigation pathname={pathname} owner={owner} onNavigate={() => setOpen(false)} />
            <button type="button" onClick={logout} className={`${styles.navLink} mt-5 w-full`}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
          <button type="button" className={styles.drawerBackdrop} onClick={() => setOpen(false)} aria-label="Close navigation" />
        </div>
      ) : null}

      <main className={styles.main}>{children}</main>
    </div>
  );
}
