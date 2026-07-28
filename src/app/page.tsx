"use client";

import { ArrowUpRight, Scissors, ShieldCheck, Clock, Crown } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { Reveal } from "@/components/motion";
import { barbers, services } from "@/lib/content/site";
import MagneticButton from "@/components/motion/MagneticButton";
import { CinematicHero } from "@/components/hero/CinematicHero";

export default function Home() {
  const { lang } = useLang();

  return (
    <div className="bg-[var(--color-ink)] text-[var(--color-bone)]">
      {/* HERO SECTION — cinematic scroll sequence */}
      <CinematicHero />

      {/* FEATURED SERVICES REEL */}
      <section className="relative border-t border-[var(--color-ink-line)] py-28 px-6 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <Reveal variant="fade">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <span className="text-[var(--color-brass)] text-[11px] tracking-[0.32em] uppercase flex items-center gap-2">
                  <Scissors className="w-4 h-4" /> Menu Preview
                </span>
                <h2 className="font-display text-4xl sm:text-5xl mt-3 text-[var(--color-bone)]">
                  Bespoke <span className="italic text-[var(--color-brass)]">Grooming</span>
                </h2>
              </div>
              <a
                href="/services"
                className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-bone-muted)] hover:text-[var(--color-brass)] transition-colors flex items-center gap-1"
              >
                Full Menu &rarr;
              </a>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.slice(0, 3).map((service, idx) => {
              const serviceName = service.name[lang];
              const serviceDesc = service.blurb[lang];

              return (
                <Reveal key={idx} delay={idx * 100}>
                  <div className="group relative border border-[var(--color-ink-line)] p-8 bg-black/20 hover:border-[var(--color-brass)]/40 transition-all duration-500">
                    <div className="flex justify-between items-baseline mb-4">
                      <h3 className="font-display text-xl text-[var(--color-bone)] group-hover:text-[var(--color-brass)] transition-colors">
                        {serviceName}
                      </h3>
                      <span className="font-mono text-lg text-[var(--color-brass)]">
                        ${service.from}
                      </span>
                    </div>
                    <p className="text-sm font-light text-[var(--color-bone-muted)] leading-relaxed mb-6 line-clamp-3">
                      {serviceDesc}
                    </p>
                    <div className="flex items-center justify-between text-[11px] tracking-[0.2em] uppercase text-[var(--color-bone-muted)] border-t border-[var(--color-ink-line)] pt-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {service.minutes} min
                      </span>
                      <a href="/visit" className="text-[var(--color-brass)] opacity-0 group-hover:opacity-100 transition-opacity">
                        Reserve
                      </a>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* MASTER BARBERS SHOWCASE */}
      <section className="relative border-t border-[var(--color-ink-line)] py-28 px-6 sm:px-10 bg-black/40">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
              <span className="text-[var(--color-brass)] text-[11px] tracking-[0.32em] uppercase flex items-center justify-center gap-2">
                <Crown className="w-4 h-4" /> The Artisans
              </span>
              <h2 className="font-display text-4xl sm:text-6xl text-[var(--color-bone)]">
                Master <span className="italic text-[var(--color-brass)]">Craftsmen</span>
              </h2>
              <p className="text-sm text-[var(--color-bone-muted)] leading-relaxed">
                Dedicated professionals bringing decades of combined precision straight-razor and hair architecture experience.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {barbers.map((barber, idx) => {
              const barberName = barber.name;
              const barberRole = barber.title[lang];
              const barberBio = barber.bio[lang];

              return (
                <Reveal key={idx} delay={idx * 150}>
                  <div className="group relative flex flex-col sm:flex-row gap-6 border border-[var(--color-ink-line)] p-6 bg-neutral-950/60 hover:border-[var(--color-brass)]/50 transition-colors">
                    <div className="w-full sm:w-40 h-52 bg-neutral-900 border border-[var(--color-ink-line)] overflow-hidden relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-60" />
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-bone-muted)] font-serif text-3xl italic">
                        {barber.initials}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-2">
                      <div>
                        <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-brass)]">
                          {barberRole}
                        </span>
                        <h3 className="font-display text-2xl text-[var(--color-bone)] mt-1">
                          {barberName}
                        </h3>
                        <p className="text-xs text-[var(--color-bone-muted)] mt-3 leading-relaxed">
                          {barberBio}
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-[var(--color-ink-line)] flex justify-between items-center">
                        <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-bone-muted)]">
                          Chair {idx + 1}
                        </span>
                        <a href="/visit" className="text-xs text-[var(--color-brass)] flex items-center gap-1 hover:underline">
                          Book Chair <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* MEMBERSHIP INVITATION CTA */}
      <section className="relative border-t border-[var(--color-ink-line)] py-32 px-6 sm:px-10 overflow-hidden">
        <div className="absolute inset-0 bg-[var(--color-oxblood)]/10 pointer-events-none" />
        <div className="mx-auto max-w-4xl text-center relative z-10 space-y-8">
          <Reveal>
            <ShieldCheck className="w-10 h-10 text-[var(--color-brass)] mx-auto" />
            <h2 className="font-display text-4xl sm:text-6xl text-[var(--color-bone)] mt-4">
              By Invitation <span className="italic text-[var(--color-brass)]">Only</span>
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-bone-muted)] max-w-xl mx-auto font-light leading-relaxed">
              Experience priority booking, complimentary bar service, private lounge access, and customized monthly grooming routines.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div className="pt-4 flex justify-center">
              <MagneticButton onClick={() => (window.location.href = "/membership")}>
                Apply For Membership
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}