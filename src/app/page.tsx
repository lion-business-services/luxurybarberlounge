"use client";

import { ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";

export default function Home() {
  const { lang } = useLang();

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_-10%,rgba(184,134,42,0.12),transparent_55%),radial-gradient(circle_at_85%_110%,rgba(114,47,55,0.18),transparent_60%)]"
      />

      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 pt-20 pb-24 sm:px-10 md:grid-cols-12 md:gap-12 md:pt-32 md:pb-32">
        <div className="md:col-span-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brass)]/40 px-3 py-1 text-[10px] tracking-[0.32em] uppercase text-[var(--color-brass)]">
            <span className="h-1 w-1 rounded-full bg-[var(--color-brass)]" aria-hidden />
            {dict.hero.comingSoon[lang]}
          </span>

          <p className="mt-8 text-[11px] tracking-[0.38em] uppercase text-[var(--color-bone-muted)]">
            {dict.hero.eyebrow[lang]}
          </p>

          <h1 className="font-display mt-5 text-5xl leading-[1.02] tracking-tight text-[var(--color-bone)] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            Luxury
            <br />
            <span className="italic text-[var(--color-brass)]">Barber</span>{" "}
            Lounge
          </h1>

          <p className="font-display mt-8 max-w-xl text-xl italic leading-relaxed text-[var(--color-bone)]/85 md:text-2xl">
            {dict.hero.tagline[lang]}
          </p>

          <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <a
              href="#"
              className="group inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-7 py-3.5 text-[12px] tracking-[0.24em] uppercase text-[var(--color-ink)] transition-colors hover:bg-[var(--color-brass-light)]"
            >
              {dict.hero.cta[lang]}
              <ArrowUpRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </a>
            <span className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-bone-muted)]">
              {dict.hero.eyebrow[lang]}
            </span>
          </div>
        </div>

        <aside className="relative md:col-span-4">
          <div className="border-l border-[var(--color-ink-line)] pl-6 md:pl-8">
            <p className="text-[11px] tracking-[0.32em] uppercase text-[var(--color-oxblood)]">
              The Lounge
            </p>
            <p className="mt-6 text-base leading-relaxed text-[var(--color-bone)]/85">
              {dict.hero.intro[lang]}
            </p>

            <div className="hairline my-10" />

            <dl className="grid grid-cols-2 gap-y-6 text-[11px] tracking-[0.24em] uppercase">
              <div>
                <dt className="text-[var(--color-bone-muted)]">Cuts</dt>
                <dd className="font-display mt-2 text-2xl tracking-tight text-[var(--color-brass)]">
                  06
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-bone-muted)]">Chairs</dt>
                <dd className="font-display mt-2 text-2xl tracking-tight text-[var(--color-brass)]">
                  03
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-bone-muted)]">Service</dt>
                <dd className="font-display mt-2 text-base italic text-[var(--color-bone)]">
                  By appointment
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-bone-muted)]">Members</dt>
                <dd className="font-display mt-2 text-base italic text-[var(--color-bone)]">
                  Invitation only
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
