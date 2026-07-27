"use client";

import { ArrowUpRight, Scissors, ShieldCheck, Clock, Crown } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";
import { Reveal, Scene3D, Layer, CountUp } from "@/components/motion";
import { barbers, services } from "@/lib/content/site";
import MagneticButton from "@/components/motion/MagneticButton";

export default function Home() {
  const { lang } = useLang();

  return (
    <div className="bg-[var(--color-ink)] text-[var(--color-bone)]">
      {/* HERO SECTION */}
      <Scene3D className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_-10%,rgba(184,134,42,0.12),transparent_55%),radial-gradient(circle_at_85%_110%,rgba(114,47,55,0.18),transparent_60%)]"
        />

        <div className="relative mx-auto grid max-w-6xl gap-16 px-6 pt-20 pb-24 sm:px-10 md:grid-cols-12 md:gap-12 md:pt-32 md:pb-32">
          <Layer z={70} tilt={2} drift={16} className="md:col-span-8">
            <Reveal variant="fade">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brass)]/40 px-3 py-1 text-[10px] tracking-[0.32em] uppercase text-[var(--color-brass)]">
                <span className="h-1 w-1 rounded-full bg-[var(--color-brass)]" aria-hidden />
                {dict.hero.comingSoon[lang]}
              </span>
            </Reveal>

            <Reveal delay={80}>
              <p className="mt-8 text-[11px] tracking-[0.38em] uppercase text-[var(--color-bone-muted)]">
                {dict.hero.eyebrow[lang]}
              </p>
            </Reveal>

            <Reveal delay={150}>
              <h1 className="font-display mt-5 text-5xl leading-[1.02] tracking-tight text-[var(--color-bone)] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
                Luxury
                <br />
                <span className="italic text-[var(--color-brass)]">Barber</span> Lounge
              </h1>
            </Reveal>

            <Reveal delay={230}>
              <p className="font-display mt-8 max-w-xl text-xl italic leading-relaxed text-[var(--color-bone)]/85 md:text-2xl">
                {dict.hero.tagline[lang]}
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <a
                  href="/visit"
                  data-magnetic
                  className="group inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-7 py-3.5 text-[12px] tracking-[0.24em] uppercase text-[var(--color-ink)] transition-colors duration-300 hover:bg-[var(--color-brass-light)]"
                >
                  {dict.hero.cta[lang]}
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </a>
              </div>
            </Reveal>
          </Layer>

          <Layer z={-90} tilt={-1.5} drift={30} className="relative md:col-span-4">
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
                    <CountUp value={services.length} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--color-bone-muted)]">Chairs</dt>
                  <dd className="font-display mt-2 text-2xl tracking-tight text-[var(--color-brass)]">
                    <CountUp value={barbers.length} />
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
          </Layer>
        </div>
      </Scene3D>

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
            {services.slice(0, 3).map((service: any, idx) => {
              const serviceName =
                service.name?.[lang] ||
                service.name ||
                service.title?.[lang] ||
                service.title ||
                "Signature Service";

              const serviceDesc =
                service.description?.[lang] ||
                service.description ||
                service.desc ||
                "Traditional craftsmanship and luxury grooming.";

              return (
                <Reveal key={idx} delay={idx * 100}>
                  <div className="group relative border border-[var(--color-ink-line)] p-8 bg-black/20 hover:border-[var(--color-brass)]/40 transition-all duration-500">
                    <div className="flex justify-between items-baseline mb-4">
                      <h3 className="font-display text-xl text-[var(--color-bone)] group-hover:text-[var(--color-brass)] transition-colors">
                        {serviceName}
                      </h3>
                      <span className="font-mono text-lg text-[var(--color-brass)]">
                        ${service.price}
                      </span>
                    </div>
                    <p className="text-sm font-light text-[var(--color-bone-muted)] leading-relaxed mb-6 line-clamp-3">
                      {serviceDesc}
                    </p>
                    <div className="flex items-center justify-between text-[11px] tracking-[0.2em] uppercase text-[var(--color-bone-muted)] border-t border-[var(--color-ink-line)] pt-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {service.duration || "45 min"}
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
            {barbers.map((barber: any, idx) => {
              const barberName = barber.name?.[lang] || barber.name || "Master Barber";
              const barberRole = barber.role?.[lang] || barber.role || "Senior Barber";
              const barberBio =
                barber.bio?.[lang] ||
                barber.bio ||
                "Specializing in classic silhouettes, precision fades, and traditional straight razor shaves.";

              return (
                <Reveal key={idx} delay={idx * 150}>
                  <div className="group relative flex flex-col sm:flex-row gap-6 border border-[var(--color-ink-line)] p-6 bg-neutral-950/60 hover:border-[var(--color-brass)]/50 transition-colors">
                    <div className="w-full sm:w-40 h-52 bg-neutral-900 border border-[var(--color-ink-line)] overflow-hidden relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-60" />
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-bone-muted)] font-serif text-3xl italic">
                        {barberName[0]}
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