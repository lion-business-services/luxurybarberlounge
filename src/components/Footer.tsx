"use client";

import { Phone, MapPin } from "lucide-react";
import { InstagramIcon, FacebookIcon } from "./SocialIcons";
import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";
import { Logo } from "./Logo";

export function Footer() {
  const { lang } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-[var(--color-ink-line)] bg-[var(--color-ink)]">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-10 md:grid-cols-[1.4fr_1fr_1fr_0.9fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-[var(--color-bone-muted)]">
            {dict.footer.tagline[lang]}
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-[11px] tracking-[0.28em] uppercase text-[var(--color-brass)]">
            {dict.footer.sectionVisit[lang]}
          </h3>
          <ul className="space-y-2 text-sm text-[var(--color-bone-muted)]">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-[var(--color-brass)]" aria-hidden />
              <span>{dict.footer.addressPlaceholder[lang]}</span>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-[var(--color-brass)]" aria-hidden />
              <span>{dict.footer.phonePlaceholder[lang]}</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-[11px] tracking-[0.28em] uppercase text-[var(--color-brass)]">
            {dict.footer.sectionHours[lang]}
          </h3>
          <ul className="space-y-2 text-sm text-[var(--color-bone-muted)]">
            <li>{dict.footer.hoursWeekday[lang]}</li>
            <li>{dict.footer.hoursSat[lang]}</li>
            <li>{dict.footer.hoursSunMon[lang]}</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-[11px] tracking-[0.28em] uppercase text-[var(--color-brass)]">
            {dict.footer.sectionFollow[lang]}
          </h3>
          <ul className="flex gap-3">
            <li>
              <a
                href="#"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-ink-line)] text-[var(--color-bone-muted)] transition-colors hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
            </li>
            <li>
              <a
                href="#"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-ink-line)] text-[var(--color-bone-muted)] transition-colors hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--color-ink-line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-6 text-[11px] tracking-[0.22em] uppercase text-[var(--color-bone-muted)] sm:flex-row sm:items-center sm:px-10">
          <span>© {year} · Luxury Barber Lounge</span>
          <span>{dict.footer.rights[lang]}</span>
        </div>
      </div>
    </footer>
  );
}
