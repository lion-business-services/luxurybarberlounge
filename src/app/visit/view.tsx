"use client";

import { MapPin, Phone, ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D } from "@/components/motion";
import { useLang } from "@/lib/i18n/context";
import { business, copy, hours } from "@/lib/content/site";

export function VisitView() {
  const { lang } = useLang();

  return (
    <>
      <PageHero
        eyebrow={copy.visit.eyebrow}
        title={copy.visit.title}
        lead={copy.visit.lead}
      />

      <Scene3D className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <div className="grid gap-14 md:grid-cols-2">
          {/* Hours */}
          <Reveal variant="left">
            <h2 className="text-[11px] tracking-[0.3em] uppercase text-[var(--color-brass)]">
              {copy.visit.hoursTitle[lang]}
            </h2>
            <div className="hairline my-6" />
            <dl className="space-y-3">
              {hours.map((row) => (
                <div
                  key={row.day.en}
                  className="flex items-baseline justify-between gap-6 border-b border-[var(--color-ink-line)] pb-3 last:border-0"
                >
                  <dt className="text-sm tracking-[0.14em] uppercase text-[var(--color-bone)]/85">
                    {row.day[lang]}
                  </dt>
                  <dd
                    className={
                      row.closed
                        ? "text-[11px] tracking-[0.24em] uppercase text-[var(--color-oxblood)]"
                        : "font-display text-lg tracking-tight text-[var(--color-brass)]"
                    }
                  >
                    {row.closed ? copy.common.closed[lang] : `${row.open} – ${row.close}`}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          {/* Getting here */}
          <Reveal variant="right" delay={120}>
            <h2 className="text-[11px] tracking-[0.3em] uppercase text-[var(--color-brass)]">
              {copy.visit.findTitle[lang]}
            </h2>
            <div className="hairline my-6" />

            <address className="not-italic">
              <p className="flex items-start gap-3 text-base leading-relaxed text-[var(--color-bone)]/85">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden />
                <span>
                  {business.street}
                  <br />
                  {business.city}
                </span>
              </p>
              <p className="mt-4 flex items-center gap-3 text-base text-[var(--color-bone)]/85">
                <Phone className="h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden />
                <a
                  href={business.phoneHref}
                  data-magnetic
                  className="transition-colors duration-300 hover:text-[var(--color-brass)]"
                >
                  {business.phone}
                </a>
              </p>
            </address>

            <p className="mt-6 text-sm leading-relaxed text-[var(--color-bone-muted)]">
              {copy.visit.parking[lang]}
            </p>

            <a
              href={business.mapsUrl}
              target="_blank"
              rel="noreferrer"
              data-magnetic
              className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-7 py-3.5 text-[12px] tracking-[0.24em] uppercase text-[var(--color-ink)] transition-colors duration-300 hover:bg-[var(--color-brass-light)]"
            >
              {copy.visit.directions[lang]}
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </a>
          </Reveal>
        </div>

      </Scene3D>
    </>
  );
}
