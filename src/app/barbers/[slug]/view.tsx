"use client";

import Link from "next/link";
import { ArrowUpRight, Languages, Scissors, UserRound } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D } from "@/components/motion";
import { LuxuryCard } from "@/components/marketing/LuxuryCard";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { useLang } from "@/lib/i18n/context";
import { services, type Barber } from "@/lib/content/site";

export function BarberDetailView({ barber }: { barber: Barber }) {
  const { lang } = useLang();
  const menu = barber.serviceSlugs.map((slug) => services.find((item) => item.slug === slug)).filter((item) => item !== undefined);

  return (
    <>
      <PageHero
        eyebrow={barber.title}
        title={{ en: barber.name, es: barber.name }}
        lead={barber.bio}
      />
      <Scene3D className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
          <Reveal>
            <LuxuryCard className="relative min-h-[420px] p-0" elevated>
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(184,134,42,.18),transparent_52%)]">
                <div className="grid h-52 w-44 place-items-center border border-[var(--color-brass)]/30 bg-black/25">
                  <UserRound className="h-20 w-20 text-[var(--color-brass)]/70" aria-hidden />
                  <span className="font-display mt-4 text-4xl text-[var(--color-bone)]">{barber.initials}</span>
                </div>
              </div>
            </LuxuryCard>
          </Reveal>
          <Reveal delay={90}>
            <LuxuryCard className="h-full p-8 sm:p-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-brass)]">{lang === "es" ? "En la silla" : "In the chair"}</p>
              <p className="font-display mt-5 text-3xl leading-relaxed text-[var(--color-bone)]">{barber.story[lang]}</p>
              <div className="mt-9 grid gap-5 border-t border-[var(--color-ink-line)] pt-7 sm:grid-cols-2">
                <div className="flex gap-3">
                  <Scissors className="h-5 w-5 shrink-0 text-[var(--color-brass)]" aria-hidden />
                  <div><p className="text-[9px] tracking-[0.25em] uppercase text-[var(--color-bone-muted)]">{lang === "es" ? "Especialidades" : "Specialties"}</p><p className="mt-2 text-sm leading-6">{barber.specialties[lang]}</p></div>
                </div>
                <div className="flex gap-3">
                  <Languages className="h-5 w-5 shrink-0 text-[var(--color-brass)]" aria-hidden />
                  <div><p className="text-[9px] tracking-[0.25em] uppercase text-[var(--color-bone-muted)]">{lang === "es" ? "Idiomas" : "Languages"}</p><p className="mt-2 text-sm leading-6">{barber.languages}</p></div>
                </div>
              </div>
              <Link href={`/book?barber=${barber.slug}`} data-magnetic="true" className="mt-9 inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-7 py-3.5 text-[11px] tracking-[0.24em] uppercase text-[var(--color-ink)] hover:bg-[var(--color-brass-light)]">
                {lang === "es" ? `Reservar con ${barber.name}` : `Book with ${barber.name}`}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </LuxuryCard>
          </Reveal>
        </div>

        <section className="mt-20">
          <SectionHeading eyebrow={lang === "es" ? "Menú seleccionado" : "Selected menu"} title={lang === "es" ? "Servicios disponibles" : "Services available"} copy={lang === "es" ? "Los servicios finales y la disponibilidad se sincronizarán con Square." : "Final service eligibility and availability will synchronize from Square."} />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {menu.map((service) => (
              <Link key={service.slug} href={`/book?service=${service.slug}&barber=${barber.slug}`} className="group border border-[var(--color-ink-line)] p-6 transition hover:border-[var(--color-brass)]/55">
                <h3 className="font-display text-xl group-hover:text-[var(--color-brass)]">{service.name[lang]}</h3>
                <p className="mt-3 text-sm text-[var(--color-bone-muted)]">{service.minutes} min · {lang === "es" ? "desde" : "from"} ${service.from}</p>
              </Link>
            ))}
          </div>
        </section>
      </Scene3D>
    </>
  );
}
