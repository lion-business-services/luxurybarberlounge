"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
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
  { href: "/visit", key: "visit" as const },
];

export function Header() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-ink-line)] bg-[var(--color-ink)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <Logo />

        <nav
          aria-label="Primary"
          className="hidden items-center gap-9 md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[12px] tracking-[0.22em] uppercase text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-brass)]"
            >
              {dict.nav[item.key][lang]}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <LanguageToggle />
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-ink-line)] text-[var(--color-bone)] md:hidden"
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Menu className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      <div
        className={clsx(
          "md:hidden",
          open
            ? "block border-t border-[var(--color-ink-line)]"
            : "hidden",
        )}
      >
        <nav
          aria-label="Mobile"
          className="mx-auto flex max-w-6xl flex-col gap-1 px-6 pb-6 pt-3"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="border-b border-[var(--color-ink-line)] py-3 text-sm tracking-[0.22em] uppercase text-[var(--color-bone)] last:border-0"
            >
              {dict.nav[item.key][lang]}
            </Link>
          ))}
          <div className="pt-4">
            <LanguageToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
