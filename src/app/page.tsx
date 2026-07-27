"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock3, Star, Users, Scissors, Crown, MapPin } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";
import { Reveal } from "@/components/Reveal";
import { ScrollDiscover } from "@/components/ScrollDiscover";

const services = [
  { name: "The Executive Cut", detail: "Consultation, tailored cut, hot towel finish", time: "50 min", price: "From $55" },
  { name: "Signature Fade", detail: "Precision skin fade with detailed finishing", time: "45 min", price: "From $50" },
  { name: "Cut & Beard Ritual", detail: "Full haircut, beard sculpting, and conditioning", time: "75 min", price: "From $85" },
];
const barbers = [
  { name: "Carlos", specialty: "Precision fades & modern classics", availability: "Next opening: Today 3:30 PM" },
  { name: "Ruben", specialty: "Executive grooming & beard design", availability: "Next opening: Tomorrow 11:00 AM" },
  { name: "Marco", specialty: "Texture, scissor work & transformations", availability: "Next opening: Friday 1:15 PM" },
];

export default function Home() {
  const { lang } = useLang();
  return <>
    <section className="hero-shell relative overflow-hidden">
      <div className="hero-grid" aria-hidden />
      <div className="hero-glow" aria-hidden />
      <div className="relative mx-auto grid min-h-[calc(100vh-84px)] max-w-6xl items-center gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1.08fr_.92fr]">
        <div className="relative z-10">
          <span className="eyebrow-pill"><span />{dict.hero.comingSoon[lang]}</span>
          <p className="mt-8 text-[11px] tracking-[0.38em] uppercase text-[var(--color-bone-muted)]">{dict.hero.eyebrow[lang]}</p>
          <h1 className="font-display mt-5 text-5xl leading-[.98] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.65rem]">Luxury<br/><span className="italic text-[var(--color-brass)]">Barber</span> Lounge</h1>
          <p className="font-display mt-7 max-w-2xl text-xl italic leading-relaxed text-[var(--color-bone)]/85 md:text-2xl">{dict.hero.tagline[lang]}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/book" className="gold-button" data-magnetic>{dict.hero.cta[lang]}<ArrowUpRight/></Link>
            <Link href="/walk-ins" className="outline-button" data-magnetic>Join Walk-In Queue</Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs uppercase tracking-[.18em] text-[var(--color-bone-muted)]"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[var(--color-brass)]"/>Open today · 10–7</span><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--color-brass)]"/>Location details coming soon</span></div>
        </div>
        <div className="hero-crest-wrap" aria-hidden>
          <div className="crest-halo" />
          <Image src="/brand/luxury-barber-logo.png" alt="Luxury Barber Lounge crest" width={850} height={850} className="hero-crest" priority />
          <div className="floating-chip chip-one"><Crown/>Private lounge</div>
          <div className="floating-chip chip-two"><Scissors/>Master craftsmanship</div>
        </div>
        <div className="scroll-cue" aria-hidden><span>Scroll to discover</span><i /></div>
      </div>
    </section>

    <section className="border-y border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/55"><div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-[var(--color-ink-line)] px-6 sm:px-10 lg:grid-cols-4"><Stat icon={<Scissors/>} value="06" label="Signature services"/><Stat icon={<Users/>} value="03" label="Master barbers"/><Stat icon={<Star/>} value="5.0" label="Experience standard"/><Stat icon={<CalendarDays/>} value="Live" label="Booking ready"/></div></section>

    <section className="mx-auto max-w-6xl px-6 py-28 sm:px-10">
      <Reveal><div className="max-w-2xl"><p className="section-kicker">The menu</p><h2 className="section-title">Designed around the way you want to <span>show up.</span></h2><p className="section-copy">A focused menu, precise timing, and direct booking. No theatrical nonsense, except the tasteful kind.</p></div></Reveal>
      <div className="mt-14 grid gap-5 lg:grid-cols-3">{services.map((service, i)=><Reveal key={service.name} className={`delay-${i+1}`}><article className="service-card"><span className="service-index">0{i+1}</span><h3>{service.name}</h3><p>{service.detail}</p><div><span>{service.time}</span><strong>{service.price}</strong></div><Link href="/book">Reserve service <ArrowUpRight/></Link></article></Reveal>)}</div>
      <div className="mt-10 text-center"><Link href="/services" className="text-link">Explore the full service menu <ArrowUpRight/></Link></div>
    </section>

    <ScrollDiscover/>

    <section className="mx-auto max-w-6xl px-6 py-28 sm:px-10">
      <Reveal><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="max-w-2xl"><p className="section-kicker">Choose your chair</p><h2 className="section-title">A barber for every <span>signature.</span></h2></div><Link href="/barbers" className="text-link">Meet the team <ArrowUpRight/></Link></div></Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-3">{barbers.map((barber,i)=><Reveal key={barber.name} className={`delay-${i+1}`}><article className="barber-card"><div className="barber-portrait"><span>{barber.name.charAt(0)}</span><div className="portrait-shine"/></div><div className="p-6"><p className="section-kicker">Chair 0{i+1}</p><h3>{barber.name}</h3><p>{barber.specialty}</p><small>{barber.availability}</small><Link href="/book">Book with {barber.name}<ArrowUpRight/></Link></div></article></Reveal>)}</div>
    </section>

    <section className="cta-panel"><div className="mx-auto max-w-4xl px-6 py-24 text-center sm:px-10"><Reveal><p className="section-kicker">Your next appointment</p><h2 className="font-display mt-4 text-4xl sm:text-6xl">The chair is ready.</h2><p className="mx-auto mt-6 max-w-xl text-[var(--color-bone-muted)]">Select a service, choose your barber, and reserve the time that fits your schedule.</p><div className="mt-9 flex flex-wrap justify-center gap-4"><Link href="/book" className="gold-button">Book an appointment<ArrowUpRight/></Link><Link href="/visit" className="outline-button">Plan your visit</Link></div></Reveal></div></section>
  </>;
}

function Stat({icon,value,label}:{icon:React.ReactNode;value:string;label:string}){return <div className="px-4 py-7 text-center sm:px-8"><span className="mx-auto mb-3 block h-4 w-4 text-[var(--color-brass)]">{icon}</span><strong className="font-display block text-2xl text-[var(--color-bone)]">{value}</strong><span className="mt-1 block text-[9px] uppercase tracking-[.2em] text-[var(--color-bone-muted)]">{label}</span></div>}
