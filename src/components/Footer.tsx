"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { InstagramIcon, FacebookIcon } from "./SocialIcons";
import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";
import { Logo } from "./Logo";
import { business, hours } from "@/lib/content/site";

const explore = [
  ["Services", "/services"], ["Barbers", "/barbers"], ["Membership", "/membership"],
  ["Gallery", "/gallery"], ["Journal", "/journal"], ["FAQ", "/faq"], ["About", "/about"], ["Contact", "/contact"],
] as const;

export function Footer() {
  const { lang } = useLang();
  const pathname = usePathname();
  const year = new Date().getFullYear();
  if (/^\/(client|barber|reception|admin|kiosk)(?:\/|$)/.test(pathname) || ["/login", "/register", "/forgot-password"].includes(pathname)) return null;

  return (
    <footer className="mt-24 border-t border-[var(--color-ink-line)] bg-[var(--color-ink)]">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-10 md:grid-cols-2 xl:grid-cols-[1.35fr_1.1fr_1fr_0.8fr]">
        <div className="space-y-5">
          <Logo />
          <p className="max-w-sm text-sm leading-7 text-[var(--color-bone-muted)]">{dict.footer.tagline[lang]}</p>
          <Link href="/book" data-magnetic="true" className="inline-flex rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.22em] uppercase text-[var(--color-ink)]">{dict.nav.book[lang]}</Link>
        </div>

        <div>
          <h3 className="mb-5 text-[10px] tracking-[0.28em] uppercase text-[var(--color-brass)]">{dict.footer.sectionVisit[lang]}</h3>
          <ul className="space-y-4 text-sm leading-6 text-[var(--color-bone-muted)]">
            <li><a href={business.mapsUrl} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:text-[var(--color-bone)]"><MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--color-brass)]" /><span>{business.street}<br />{business.city}, {business.state} {business.postalCode}</span></a></li>
            <li><a href={business.phoneHref} className="flex items-center gap-3 hover:text-[var(--color-bone)]"><Phone className="h-4 w-4 text-[var(--color-brass)]" />{business.phone}</a></li>
            <li><a href={`mailto:${business.email}`} className="flex items-center gap-3 break-all hover:text-[var(--color-bone)]"><Mail className="h-4 w-4 shrink-0 text-[var(--color-brass)]" />{business.email}</a></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-[10px] tracking-[0.28em] uppercase text-[var(--color-brass)]">{dict.footer.sectionHours[lang]}</h3>
          <ul className="space-y-2 text-sm text-[var(--color-bone-muted)]">
            {hours.map((item) => <li key={item.weekday} className="flex justify-between gap-5"><span>{item.day[lang]}</span><span className={item.closed ? "text-[var(--color-oxblood)]" : "text-[var(--color-bone)]"}>{item.closed ? (lang === "es" ? "Cerrado" : "Closed") : `${item.open}–${item.close}`}</span></li>)}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 text-[10px] tracking-[0.28em] uppercase text-[var(--color-brass)]">{dict.footer.sectionExplore[lang]}</h3>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm text-[var(--color-bone-muted)] xl:grid-cols-1">
            {explore.map(([label, href]) => <li key={href}><Link href={href} className="transition hover:text-[var(--color-brass)]">{label}</Link></li>)}
          </ul>
          <div className="mt-7 flex gap-3">
            <a href={business.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="social-button"><InstagramIcon className="h-4 w-4" /></a>
            <a href={business.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="social-button"><FacebookIcon className="h-4 w-4" /></a>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-ink-line)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-7 text-[10px] tracking-[0.17em] uppercase text-[var(--color-bone-muted)] sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <span>© {year} · {business.name} · {dict.footer.rights[lang]}</span>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/sms-terms">SMS</Link><Link href="/accessibility">Accessibility</Link><Link href="/cookies">Cookies</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
