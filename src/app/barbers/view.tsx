"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D, Layer, TiltCard } from "@/components/motion";
import { useLang } from "@/lib/i18n/context";
import { barbers, copy } from "@/lib/content/site";

export function BarbersView() {
  const { lang } = useLang();

  return (
    <>
      <PageHero
        eyebrow={copy.barbers.eyebrow}
        title={copy.barbers.title}
        lead={copy.barbers.lead}
      />

      <Scene3D className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <ul className="grid gap-10 md:grid-cols-2">
          {barbers.map((barber, i) => (
            <li key={barber.slug}>
              <Reveal delay={i * 80} variant={i % 2 ? "right" : "left"} className="block h-full">
                <TiltCard max={5} className="h-full">
                  <article className="group flex h-full gap-6 border border-[var(--color-ink-line)] bg-[var(--color-ink)] p-7 transition-colors duration-500 hover:border-[var(--color-brass)]/40">
                    {/* Portrait plate — layered so the initial floats above the frame in 3D. */}
                    <div
                      aria-hidden
                      className="relative grid h-24 w-20 shrink-0 place-items-center border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <span
                        className="font-display text-2xl text-[var(--color-brass)]"
                        style={{ transform: "translateZ(28px)" }}
                      >
                        {barber.initials}
                      </span>
                      <span className="absolute inset-x-3 bottom-3 h-px bg-[var(--color-brass)]/30" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-2xl tracking-tight text-[var(--color-bone)]">
                        {barber.name}
                      </h2>
                      <p className="mt-1 text-[10px] tracking-[0.3em] uppercase text-[var(--color-brass)]">
                        {barber.title[lang]}
                      </p>
                      <p className="mt-4 text-sm leading-relaxed text-[var(--color-bone)]/75">
                        {barber.bio[lang]}
                      </p>

                      <dl className="mt-5 space-y-1 text-[11px] tracking-[0.18em] uppercase text-[var(--color-bone-muted)]">
                        <div className="flex gap-2">
                          <dt className="sr-only">Specialties</dt>
                          <dd>{barber.specialties[lang]}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="sr-only">Languages</dt>
                          <dd>{barber.languages}</dd>
                        </div>
                      </dl>

                      <Link
                        href="/visit"
                        data-magnetic
                        className="mt-6 inline-flex items-center gap-2 text-[11px] tracking-[0.26em] uppercase text-[var(--color-brass)] transition-colors duration-300 hover:text-[var(--color-brass-light)]"
                      >
                        {copy.common.book[lang]}
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            </li>
          ))}
        </ul>

        <Layer z={-140} drift={30}>
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
