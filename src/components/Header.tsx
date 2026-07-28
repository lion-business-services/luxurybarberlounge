"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, Menu, UserRound, X } from "lucide-react";
import clsx from "clsx";
import { Logo } from "./Logo";
import { LanguageToggle } from "./LanguageToggle";
import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";

const NAV_ITEMS = [
  { href: "/", key: "home" as const },
  { href: "/services", key: "services" as const },
  { href: "/barbers", key: "barbers" as const },
  { href: "/membership", key: "membership" as const },
  { href: "/gallery", key: "gallery" as const },
  { href: "/visit", key: "visit" as const },
];

export function Header() {
  const { lang } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const portalMatch = pathname.match(/^\/(client|barber|reception|admin)(?:\/|$)/);
  if (pathname.startsWith("/kiosk")) return null;
  if (portalMatch) {
    const label = portalMatch[1] === "admin" ? "Owner & Admin" : portalMatch[1] === "reception" ? "Reception Console" : portalMatch[1] === "barber" ? "Barber Workspace" : "Client Portal";
    return (
      <header className="sticky top-0 z-40 border-b border-[var(--color-ink-line)] bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-7">
          <div className="flex items-center gap-4"><Logo compact /><span className="hidden text-[10px] tracking-[.24em] uppercase text-[var(--color-brass)] sm:block">{label}</span></div>
          <div className="flex items-center gap-2"><Link href="/" className="rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] tracking-[.16em] uppercase text-[var(--color-bone-muted)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]">Public site</Link><Link href="/login" className="rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Account</Link></div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-ink-line)] bg-[var(--color-ink)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-10">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex xl:gap-8">
          {NAV_ITEMS.map((item) => {
            const current = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={clsx(
                  "relative py-2 text-[10px] tracking-[0.22em] uppercase transition-colors",
                  current ? "text-[var(--color-brass)]" : "text-[var(--color-bone-muted)] hover:text-[var(--color-brass)]",
                )}
              >
                {dict.nav[item.key][lang]}
                {current ? <span className="absolute inset-x-0 -bottom-0.5 h-px bg-[var(--color-brass)]" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageToggle />
          <Link
            href="/login"
            aria-label={dict.nav.portal[lang]}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--color-ink-line)] text-[var(--color-bone-muted)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-brass)] xl:inline-flex"
          >
            <UserRound className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/book"
            data-magnetic="true"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] tracking-[0.22em] uppercase text-[var(--color-ink)] transition hover:bg-[var(--color-brass-light)]"
          >
            <CalendarDays className="h-4 w-4" aria-hidden />
            {dict.nav.book[lang]}
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-ink-line)] text-[var(--color-bone)] md:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      <div className={clsx("md:hidden", open ? "block border-t border-[var(--color-ink-line)]" : "hidden")}>
        <nav aria-label="Mobile" className="mx-auto flex max-w-7xl flex-col px-6 pb-7 pt-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="border-b border-[var(--color-ink-line)] py-4 text-sm tracking-[0.2em] uppercase text-[var(--color-bone)]"
            >
              {dict.nav[item.key][lang]}
            </Link>
          ))}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/login" onClick={() => setOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 py-3 text-[10px] tracking-[.18em] uppercase">
              <UserRound className="h-4 w-4" /> {dict.nav.portal[lang]}
            </Link>
            <Link href="/book" onClick={() => setOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brass)] px-4 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)]">
              <CalendarDays className="h-4 w-4" /> {dict.nav.book[lang]}
            </Link>
          </div>
          <div className="pt-5"><LanguageToggle /></div>
        </nav>
      </div>
    </header>
  );
}
