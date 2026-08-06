"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Languages, Scissors } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D } from "@/components/motion";
import { useLang } from "@/lib/i18n/context";
import { barbers, copy } from "@/lib/content/site";

export function BarbersView() {
  const { lang } = useLang();
  const roster = barbers.filter((barber) => barber.active);

  return (
    <>
      <PageHero eyebrow={copy.barbers.eyebrow} title={copy.barbers.title} lead={copy.barbers.lead} />
      <Scene3D className="mx-auto max-w-7xl px-6 pb-28 sm:px-10">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {roster.map((barber, index) => (
            <Reveal key={barber.slug} delay={Math.min(index * 55, 240)} variant={index % 2 ? "right" : "left"}>
              <article className="group relative h-[42rem] overflow-hidden border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)] transition duration-500 hover:border-[var(--color-brass)]/60">
                <Image
                  src={barber.image.card}
                  alt={barber.image.alt[lang]}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  style={{ objectPosition: barber.image.objectPosition.card }}
                  className="object-cover transition duration-700 group-hover:scale-[1.025]"
                  priority={index < 2}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(5,5,5,.96)_84%)]" />
                <div className="absolute inset-x-0 bottom-0 z-10 grid min-h-[23rem] grid-rows-[auto_auto_4.75rem_6rem_auto] p-6 sm:p-7">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--color-brass)]">{barber.title[lang]}</p>
                  <h2 className="font-display mt-2 text-3xl text-[var(--color-bone)]">{barber.name}</h2>
                  <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[var(--color-bone-muted)]">{barber.bio[lang]}</p>
                  <div className="mt-5 grid min-h-[6rem] content-start gap-3 border-t border-white/10 pt-5">
                    <p className="flex gap-2 text-[10px] leading-5 tracking-[0.16em] uppercase text-[var(--color-bone-muted)]"><Scissors className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden />{barber.specialties[lang]}</p>
                    <p className="flex gap-2 text-[10px] tracking-[0.18em] uppercase text-[var(--color-bone-muted)]"><Languages className="h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden />{barber.languages}</p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link href={`/barbers/${barber.slug}`} className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--color-bone)] transition hover:text-[var(--color-brass)]">{lang === "es" ? "Ver perfil" : "View profile"}<ArrowUpRight className="h-4 w-4" /></Link>
                    <Link href={`/book?barber=${barber.slug}`} data-magnetic="true" className="ml-auto inline-flex rounded-full bg-[var(--color-brass)] px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink)]">{copy.common.book[lang]}</Link>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-12">
          <div className="border border-[var(--color-ink-line)] p-8 text-center">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-brass)]">{lang === "es" ? "¿No estás seguro?" : "Not sure who to choose?"}</p>
            <h2 className="font-display mt-4 text-3xl">{lang === "es" ? "Reserva la mejor disponibilidad." : "Book the best available chair."}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--color-bone-muted)]">{lang === "es" ? "Selecciona tu servicio y el lounge te ayudará a encontrar una silla adecuada para tu cita." : "Choose your service and the lounge will help match you with a suitable chair for your appointment."}</p>
            <Link href="/book?barber=best-available" data-magnetic="true" className="mt-7 inline-flex rounded-full bg-[var(--color-brass)] px-7 py-3 text-[10px] tracking-[0.25em] uppercase text-[var(--color-ink)]">{lang === "es" ? "Mejor disponible" : "Best available"}</Link>
          </div>
        </Reveal>
      </Scene3D>
    </>
  );
}
