"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, CircleUserRound, Home, ListOrdered, LogOut } from "lucide-react";
import styles from "./client-portal.module.css";

type Session = { email: string | null; roles: string[]; activeRole: string | null };
type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };

const navigation: Item[] = [
  { label: "Home", href: "/client", icon: Home },
  { label: "Visits", href: "/client/appointments", icon: CalendarDays },
  { label: "Queue", href: "/client/queue", icon: ListOrdered },
  { label: "Account", href: "/client/account", icon: CircleUserRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/client") return pathname === href;
  if (href === "/client/account") {
    return [
      "/client/account",
      "/client/profile",
      "/client/membership",
      "/client/orders",
      "/client/notifications",
      "/client/settings",
      "/client/privacy",
      "/client/support",
    ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((data) => {
        if (active) setSession(data as Session);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/");
    router.refresh();
  }

  const initial = (session?.email?.[0] ?? "G").toUpperCase();
  return (
    <div className={styles.shell} data-client-portal>
      <div className={styles.frame}>
        <header className={styles.topbar}>
          <div className={styles.identity}>
            <span className={styles.avatar}>{initial}</span>
            <div className="min-w-0">
              <p className={styles.title}>My Lounge</p>
              <p className={styles.subtitle}>{session?.email ?? "Secure client account"}</p>
            </div>
          </div>
          <div className={styles.topActions}>
            <Link href="/book" className={styles.primaryButton}>Book now</Link>
            <button type="button" onClick={logout} className={styles.iconButton} aria-label="Sign out" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <nav className={styles.desktopNav} aria-label="Client portal">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} data-active={isActive(pathname, item.href)} className={styles.desktopLink}>
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
          <button type="button" onClick={logout} className={styles.desktopLink}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </nav>

        <div className={styles.content}>{children}</div>
      </div>

      <nav className={styles.bottomNav} aria-label="Primary client navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} data-active={isActive(pathname, item.href)} className={styles.bottomLink}>
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
