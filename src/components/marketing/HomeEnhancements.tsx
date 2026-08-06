"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpenText, CalendarDays, Gift, MapPin, Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { business, journalPosts, packages } from "@/lib/content/site";
import { Reveal, Scene3D, TiltCard } from "@/components/motion";

export function HomeEnhancements() {
  const { lang } = useLang();
  return (
    <>
      <Scene3D className="border-t border-[var(--color-ink-line)] px-6 py-28 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <Reveal className="grid items-end gap-8 lg:grid-cols-[1fr_.8fr]">
            <div>
              <p className="text-[10px] tracking-[.32em] uppercase text-[var(--color-brass)]">The right service, without the guesswork</p>
              <h2 className="font-display mt-5 text-4xl leading-tight sm:text-6xl">Start with the result.<br /><span className="italic text-[var(--color-brass)]">We shape the ritual.</span></h2>
            </div>
            <p className="text-sm leading-7 text-[var(--color-bone-muted)]">Explore the complete menu or use the guided booking flow to pair your goal with a service, add-ons, and the right chair. Clear choices first. Barber jargon only when it is actually useful.</p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: Sparkles, title: lang === "es" ? "Quiero un cambio" : "I want a new look", copy: lang === "es" ? "Consulta y corte personalizado para una transformación bien planificada." : "Consultation-led custom cutting for a considered transformation.", href: "/book?service=haircut" },
              { icon: CalendarDays, title: lang === "es" ? "Mantenerlo impecable" : "Keep it consistently sharp", copy: lang === "es" ? "Fades, shape-ups y mantenimiento de barba en un ritmo repetible." : "Fades, shape-ups, and beard maintenance on a repeatable rhythm.", href: "/membership" },
              { icon: Gift, title: lang === "es" ? "Regalar la experiencia" : "Give the experience", copy: lang === "es" ? "Tarjetas y paquetes para alguien que aprecia el detalle." : "Gift cards and packages for someone who notices the details.", href: "/gift-cards" },
            ].map((item, index) => <Reveal key={item.title} delay={index * 80}><TiltCard className="h-full"><Link href={item.href} className="group block h-full border border-[var(--color-ink-line)] bg-black/25 p-7 transition hover:border-[var(--color-brass)]/50"><item.icon className="h-6 w-6 text-[var(--color-brass)]" /><h3 className="font-display mt-7 text-2xl">{item.title}</h3><p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">{item.copy}</p><span className="mt-7 inline-flex items-center gap-2 text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Discover <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" /></span></Link></TiltCard></Reveal>)}
          </div>
        </div>
      </Scene3D>

      <section className="border-t border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/35 px-6 py-28 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <Reveal><p className="text-center text-[10px] tracking-[.32em] uppercase text-[var(--color-brass)]">Curated combinations</p><h2 className="font-display mt-5 text-center text-4xl sm:text-6xl">More than a service.<br /><span className="italic text-[var(--color-brass)]">A complete reset.</span></h2></Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {packages.slice(0, 3).map((item, index) => <Reveal key={item.slug} delay={index * 80}><article className="h-full border border-[var(--color-ink-line)] p-7"><p className="text-[10px] tracking-[.24em] uppercase text-[var(--color-brass)]">${item.from}</p><h3 className="font-display mt-4 text-2xl">{item.name[lang]}</h3><p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">{item.description[lang]}</p><Link href={`/book?package=${item.slug}`} className="mt-7 inline-flex items-center gap-2 text-[10px] tracking-[.22em] uppercase text-[var(--color-brass)]">Request package <ArrowUpRight className="h-4 w-4" /></Link></article></Reveal>)}
          </div>
          <div className="mt-9 text-center"><Link href="/packages" className="inline-flex rounded-full border border-[var(--color-brass)]/40 px-6 py-3 text-[10px] tracking-[.22em] uppercase text-[var(--color-brass)]">View all packages</Link></div>
        </div>
      </section>

      <section className="border-t border-[var(--color-ink-line)] px-6 py-28 sm:px-10">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[.9fr_1.1fr]">
          <Reveal variant="left"><p className="text-[10px] tracking-[.32em] uppercase text-[var(--color-brass)]">The grooming journal</p><h2 className="font-display mt-5 text-4xl sm:text-5xl">Better visits begin <span className="italic text-[var(--color-brass)]">before the chair.</span></h2><p className="mt-6 max-w-lg text-sm leading-7 text-[var(--color-bone-muted)]">Practical guidance on maintenance, consultation, beard balance, and preparing for a result you can actually live with.</p><Link href="/journal" className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-6 py-3 text-[10px] tracking-[.22em] uppercase hover:border-[var(--color-brass)]"><BookOpenText className="h-4 w-4" /> Read the journal</Link></Reveal>
          <div className="space-y-3">{journalPosts.map((post, index) => <Reveal key={post.slug} delay={index * 70}><Link href={`/journal/${post.slug}`} className="group grid gap-3 border-b border-[var(--color-ink-line)] py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="text-[10px] tracking-[.18em] uppercase text-[var(--color-brass)]">0{index + 1}</span><span><strong className="font-display block text-xl font-normal group-hover:text-[var(--color-brass)]">{post.title[lang]}</strong><small className="mt-1 block text-xs leading-5 text-[var(--color-bone-muted)]">{post.excerpt[lang]}</small></span><ArrowUpRight className="h-4 w-4 text-[var(--color-brass)]" /></Link></Reveal>)}</div>
        </div>
      </section>

      <section className="border-y border-[var(--color-ink-line)] bg-[linear-gradient(125deg,rgba(184,134,42,.09),transparent_42%,rgba(114,47,55,.1))] px-6 py-24 sm:px-10">
        <Reveal className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1fr_auto]"><div><p className="text-[10px] tracking-[.32em] uppercase text-[var(--color-brass)]">Northfield, New Jersey</p><h2 className="font-display mt-4 text-4xl sm:text-5xl">Your chair is closer than you think.</h2><p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">{business.street}, {business.city}, {business.state}. {business.parking.en}</p></div><div className="flex flex-wrap gap-3"><a href={business.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-6 py-3 text-[10px] tracking-[.2em] uppercase hover:border-[var(--color-brass)]"><MapPin className="h-4 w-4" /> Directions</a><Link href="/book" data-magnetic="true" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.2em] uppercase text-[var(--color-ink)]"><CalendarDays className="h-4 w-4" /> Reserve a chair</Link></div></Reveal>
      </section>
    </>
  );
}
