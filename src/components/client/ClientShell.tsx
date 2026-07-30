"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, CircleUserRound, Home, LogOut, Menu, Scissors, UsersRound, WalletCards, X, ListOrdered, MessageCircleQuestion, Settings, Bell, Gift } from "lucide-react";
import styles from "./client-portal.module.css";

type Session = { email: string | null; roles: string[]; activeRole: string | null };
type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };

const main: Item[] = [
  { label: "Home", href: "/client", icon: Home },
  { label: "Appointments", href: "/client/appointments", icon: CalendarDays },
  { label: "Queue", href: "/client/queue", icon: ListOrdered },
  { label: "Membership", href: "/client/membership", icon: WalletCards },
  { label: "Profile", href: "/client/profile", icon: CircleUserRound },
];
const more: Item[] = [
  { label: "Barbers", href: "/client/barbers", icon: UsersRound },
  { label: "Services", href: "/client/services", icon: Scissors },
  { label: "Orders", href: "/client/orders", icon: WalletCards },
  { label: "Rewards", href: "/client/rewards", icon: Gift },
  { label: "Notifications", href: "/client/notifications", icon: Bell },
  { label: "Support", href: "/client/support", icon: MessageCircleQuestion },
  { label: "Settings", href: "/client/settings", icon: Settings },
];

function isActive(pathname: string, href: string) { return href === "/client" ? pathname === href : pathname.startsWith(href); }

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" }).then((response) => response.json()).then((data) => { if (active) setSession(data as Session); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  const initial = (session?.email?.[0] ?? "G").toUpperCase();
  return <div className={styles.shell} data-client-portal>
    <div className={styles.frame}>
      <header className={styles.topbar}>
        <div className={styles.identity}><span className={styles.avatar}>{initial}</span><div className="min-w-0"><p className={styles.title}>Your Lounge</p><p className={styles.subtitle}>{session?.email ?? "Secure client account"}</p></div></div>
        <div className="flex items-center gap-2"><Link href="/book" className="rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Book</Link><button type="button" onClick={() => setMenuOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-ink-line)] md:hidden" aria-expanded={menuOpen} aria-label="Open client menu">{menuOpen ? <X className="h-4 w-4"/> : <Menu className="h-4 w-4"/>}</button></div>
      </header>
      <nav className={styles.desktopNav} aria-label="Client portal">
        {[...main, ...more].map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} data-active={isActive(pathname,item.href)} className={styles.desktopLink}><Icon className="h-3.5 w-3.5"/>{item.label}</Link>; })}
        <button type="button" onClick={logout} className={styles.desktopLink}><LogOut className="h-3.5 w-3.5"/>Sign out</button>
      </nav>
      {menuOpen ? <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--color-ink-line)] bg-[#101010] p-3 md:hidden">{more.map((item) => { const Icon=item.icon; return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl border border-white/5 p-3 text-xs text-[var(--color-bone-muted)]"><Icon className="h-4 w-4 text-[var(--color-brass)]"/>{item.label}</Link>; })}<button type="button" onClick={logout} className="flex items-center gap-2 rounded-xl border border-white/5 p-3 text-left text-xs text-[var(--color-bone-muted)]"><LogOut className="h-4 w-4 text-[var(--color-brass)]"/>Sign out</button></div> : null}
      <div className={styles.content}>{children}</div>
    </div>
    <nav className={styles.bottomNav} aria-label="Primary client navigation">{main.map((item) => { const Icon=item.icon; return <Link key={item.href} href={item.href} data-active={isActive(pathname,item.href)} className={styles.bottomLink}><Icon className="h-4 w-4"/><span>{item.label}</span></Link>; })}</nav>
  </div>;
}
