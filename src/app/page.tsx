"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowUpRight, Clock, Crown, Scissors } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { Reveal } from "@/components/motion";
import { SectionScene } from "@/components/motion/SectionScene";
import { HomeAtmosphere } from "@/components/motion/HomeAtmosphere";
import { barbers, faqs, services } from "@/lib/content/site";
import { CinematicHero } from "@/components/hero/CinematicHero";
import {
  SpiralProgress,
  ThresholdScene,
  PrecisionScene,
  LoungeJourney,
  FinalScene,
} from "@/components/home-experience";
import { HomeEnhancements } from "@/components/marketing/HomeEnhancements";
import { FaqAccordion, TrustStrip } from "@/components/public/PublicUI";

export default function Home() {
  const { lang } = useLang();
  const postHeroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative text-[var(--color-bone)]">
      <HomeAtmosphere />

      {/* The existing cinematic hero remains the visual anchor. */}
      <CinematicHero />

      {/* ============ POST-HERO EXPERIENCE — the spiral begins here ============ */}
      <div ref={postHeroRef} className="relative">
        <SpiralProgress containerRef={postHeroRef} />

        {/* Scene 1 · The threshold — the uploaded film opens the room */}
        <ThresholdScene />

        {/* Scene 2 · The art of precision */}
        <PrecisionScene />
      <TrustStrip />

      {/* FEATURED SERVICES REEL */}
      <SectionScene className="border-t border-[var(--color-ink-line)] px-6 py-28 sm:px-10">
        <div className="relative mx-auto max-w-6xl">
          <Reveal variant="fade">
            <div className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <div>
                <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-[var(--color-brass)]">
                  <Scissors className="h-4 w-4" /> Menu Preview
                </span>
                <h2 className="font-display mt-3 text-4xl text-[var(--color-bone)] sm:text-5xl">
                  Bespoke <span className="italic text-[var(--color-brass)]">Grooming</span>
                </h2>
              </div>
              <Link
                href="/services"
                className="flex items-center gap-1 text-[11px] uppercase tracking-[0.28em] text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-brass)]"
              >
                Full Menu &rarr;
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {services.slice(0, 3).map((service, idx) => (
              <Reveal key={service.slug} delay={idx * 100}>
                <article className="group relative h-full border border-[var(--color-ink-line)] bg-black/20 p-8 transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-brass)]/40">
                  <div className="mb-4 flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-xl text-[var(--color-bone)] transition-colors group-hover:text-[var(--color-brass)]">
                      {service.name[lang]}
                    </h3>
                    <span className="font-mono text-lg text-[var(--color-brass)]">${service.from}</span>
                  </div>
                  <p className="mb-6 line-clamp-3 text-sm font-light leading-relaxed text-[var(--color-bone-muted)]">
                    {service.blurb[lang]}
                  </p>
                  <div className="flex items-center justify-between border-t border-[var(--color-ink-line)] pt-4 text-[11px] uppercase tracking-[0.2em] text-[var(--color-bone-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {service.minutes} min
                    </span>
                    <a
                      href={`/book?service=${service.slug}`}
                      className="text-[var(--color-brass)] transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                    >
                      Reserve
                    </a>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </SectionScene>


      {/* Scene 4 · The lounge environment */}
      <LoungeJourney />

      {/* MASTER BARBERS SHOWCASE */}
      <SectionScene intensity={1.15} className="border-t border-[var(--color-ink-line)] bg-black/25 px-6 py-28 sm:px-10">
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <div className="mx-auto mb-20 max-w-2xl space-y-4 text-center">
              <span className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.32em] text-[var(--color-brass)]">
                <Crown className="h-4 w-4" /> The Artisans
              </span>
              <h2 className="font-display text-4xl text-[var(--color-bone)] sm:text-6xl">
                Master <span className="italic text-[var(--color-brass)]">Craftsmen</span>
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-bone-muted)]">
                Distinct chairs, one shared standard: clear consultation, exact detail, and a result designed for real life.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {barbers.map((barber, idx) => (
              <Reveal key={barber.slug} delay={idx * 150}>
                <article className="group relative flex h-full flex-col gap-6 border border-[var(--color-ink-line)] bg-neutral-950/60 p-6 transition-colors hover:border-[var(--color-brass)]/50 sm:flex-row">
                  <div className="relative h-52 w-full flex-shrink-0 overflow-hidden border border-[var(--color-ink-line)] bg-neutral-900 sm:w-40">
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                    <div className="flex h-full w-full items-center justify-center font-serif text-3xl italic text-[var(--color-bone-muted)]">
                      {barber.initials}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between py-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-brass)]">{barber.title[lang]}</span>
                      <h3 className="font-display mt-1 text-2xl text-[var(--color-bone)]">{barber.name}</h3>
                      <p className="mt-3 text-xs leading-relaxed text-[var(--color-bone-muted)]">{barber.bio[lang]}</p>
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-[var(--color-ink-line)] pt-4">
                      <a href={`/barbers/${barber.slug}`} className="text-[10px] uppercase tracking-[.2em] text-[var(--color-bone-muted)] hover:text-[var(--color-brass)]">
                        View profile
                      </a>
                      <a href={`/book?barber=${barber.slug}`} className="flex items-center gap-1 text-xs text-[var(--color-brass)] hover:underline">
                        Book Chair <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </SectionScene>

      <HomeEnhancements />





      {/* FAQ PREVIEW */}
      <SectionScene className="border-t border-[var(--color-ink-line)] px-6 py-28 sm:px-10">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <p className="text-[10px] uppercase tracking-[.34em] text-[var(--color-brass)]">Before your visit</p>
              <h2 className="font-display mt-4 text-4xl sm:text-5xl">Answers without the runaround.</h2>
              <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">
                Booking, deposits, timing, walk-ins, and preparation are explained plainly before the chair is reserved.
              </p>
            </div>
          </Reveal>
          <FaqAccordion items={faqs.slice(0, 5).map((item) => ({ question: item.question[lang], answer: item.answer[lang] }))} />
        </div>
      </SectionScene>

      {/* Final scene · one integrated close: the chair, the facts, the booking */}
      <FinalScene />
      </div>
    </div>
  );
}
