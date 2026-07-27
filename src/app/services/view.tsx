"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, TiltCard, Scene3D, Layer } from "@/components/motion";
import { useLang } from "@/lib/i18n/context";
import { copy, services } from "@/lib/content/site";

export function ServicesView() {
  const { lang } = useLang();

  return (
    <>
      <PageHero
        eyebrow={copy.services.eyebrow}
        title={copy.services.title}
        lead={copy.services.lead}
      />

      <Scene3D className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <ul className="grid gap-px overflow-hidden rounded-sm bg-[var(--color-ink-line)] sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <li key={service.slug}>
              <Reveal delay={i * 70} className="block h-full">
                <TiltCard className="h-full">
                  <article className="group flex h-full flex-col justify-between bg-[var(--color-ink)] p-8 transition-colors duration-500 hover:bg-[var(--color-ink-soft)]">
                    <div>
                      <div className="flex items-baseline justify-between gap-4">
                        <h2 className="font-display text-2xl tracking-tight text-[var(--color-bone)]">
                          {service.name[lang]}
                        </h2>
                        <span className="text-[10px] tracking-[0.28em] uppercase text-[var(--color-bone-muted)]">
                          {service.minutes} {copy.common.minutes[lang]}
                        </span>
                      </div>
                      <p className="mt-5 text-sm leading-relaxed text-[var(--color-bone)]/75">
                        {service.blurb[lang]}
                      </p>
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-[var(--color-ink-line)] pt-5">
                      <span className="text-[11px] tracking-[0.24em] uppercase text-[var(--color-bone-muted)]">
                        {copy.common.from[lang]}{" "}
                        <span className="font-display text-lg tracking-tight text-[var(--color-brass)]">
                          ${service.from}
                        </span>
                      </span>
                      <Link
                        href="/visit"
                        data-magnetic
                        aria-label={`${copy.common.book[lang]} — ${service.name[lang]}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-ink-line)] text-[var(--color-brass)] transition-colors duration-300 hover:border-[var(--color-brass)]"
                      >
                        <ArrowUpRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            </li>
          ))}
        </ul>

        <Layer z={-120} drift={26}>
          <Reveal variant="fade" className="block">
            <p className="mt-10 text-[11px] tracking-[0.26em] uppercase text-[var(--color-bone-muted)]">
              {copy.common.confirmNote[lang]}
            </p>
          </Reveal>
        </Layer>
      </Scene3D>
    </>
  );
}
