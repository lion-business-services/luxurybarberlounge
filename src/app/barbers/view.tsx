"use client";

import Link from "next/link";
import { ArrowUpRight, Languages, Scissors, UserRound } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D, TiltCard } from "@/components/motion";
import { useLang } from "@/lib/i18n/context";
import { barbers, copy } from "@/lib/content/site";

export function BarbersView() {
  const { lang } = useLang();

  return (
    <>
      <PageHero eyebrow={copy.barbers.eyebrow} title={copy.barbers.title} lead={copy.barbers.lead} />
      <Scene3D className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-2">
          {barbers.map((barber, index) => (
            <Reveal key={barber.slug} delay={index * 90} variant={index % 2 ? "right" : "left"}>
              <TiltCard max={4} className="h-full">
                <article className="group relative h-full overflow-hidden border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)] p-7 transition duration-500 hover:border-[var(--color-brass)]/55 sm:p-9">
                  <div aria-hidden className="absolute -right-12 -top-14 font-display text-[11rem] leading-none text-[var(--color-brass)]/[0.035]">
                    {barber.initials}
                  </div>
                  <div className="relative flex gap-6">
                    <div className="relative grid h-28 w-24 shrink-0 place-items-center overflow-hidden border border-[var(--color-brass)]/25 bg-black/35">
                      <UserRound className="h-10 w-10 text-[var(--color-brass)]/75" aria-hidden />
                      <span className="absolute inset-x-3 bottom-3 h-px bg-[var(--color-brass)]/40" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--color-brass)]">{barber.title[lang]}</p>
                      <h2 className="font-display mt-2 text-3xl text-[var(--color-bone)]">{barber.name}</h2>
                      <p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">{barber.bio[lang]}</p>
                    </div>
                  </div>
                  <div className="relative mt-7 grid gap-3 border-t border-[var(--color-ink-line)] pt-6 sm:grid-cols-2">
                    <p className="flex gap-2 text-[10px] tracking-[0.19em] uppercase text-[var(--color-bone-muted)]">
                      <Scissors className="h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden />
                      {barber.specialties[lang]}
                    </p>
                    <p className="flex gap-2 text-[10px] tracking-[0.19em] uppercase text-[var(--color-bone-muted)]">
                      <Languages className="h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden />
                      {barber.languages}
                    </p>
                  </div>
                  <div className="relative mt-7 flex flex-wrap gap-3">
                    <Link href={`/barbers/${barber.slug}`} className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[var(--color-bone)] transition hover:text-[var(--color-brass)]">
                      {lang === "es" ? "Ver perfil" : "View profile"} <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <Link href={`/book?barber=${barber.slug}`} data-magnetic="true" className="ml-auto inline-flex items-center gap-2 rounded-full border border-[var(--color-brass)]/45 px-5 py-2.5 text-[10px] tracking-[0.24em] uppercase text-[var(--color-brass)] transition hover:bg-[var(--color-brass)] hover:text-[var(--color-ink)]">
                      {copy.common.book[lang]}
                    </Link>
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-12">
          <div className="border border-[var(--color-ink-line)] p-8 text-center">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-brass)]">{lang === "es" ? "¿No estás seguro?" : "Not sure who to choose?"}</p>
            <h2 className="font-display mt-4 text-3xl">{lang === "es" ? "Reserva la mejor disponibilidad." : "Book the best available chair."}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--color-bone-muted)]">{lang === "es" ? "Selecciona tu servicio y el sistema recomendará una silla según especialidad y disponibilidad real cuando Square esté conectado." : "Choose your service and the system will recommend a chair based on specialty and live availability once Square is connected."}</p>
            <Link href="/book?barber=best-available" data-magnetic="true" className="mt-7 inline-flex rounded-full bg-[var(--color-brass)] px-7 py-3 text-[10px] tracking-[0.25em] uppercase text-[var(--color-ink)]">{lang === "es" ? "Mejor disponible" : "Best available"}</Link>
          </div>
        </Reveal>
      </Scene3D>
    </>
  );
}
