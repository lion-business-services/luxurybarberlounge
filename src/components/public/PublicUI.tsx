"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  Gift,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useLang } from "@/lib/i18n/context";
import { business, services } from "@/lib/content/site";
import {
  careerRoles,
  eventOffers,
  galleryItems,
  products,
} from "@/lib/content/platform";
import { Reveal, TiltCard } from "@/components/motion";

export function DemoContentNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={clsx("border border-amber-500/25 bg-amber-950/10 text-amber-100", compact ? "rounded-lg px-4 py-3 text-xs" : "rounded-xl px-5 py-4 text-sm")}>
      <strong className="font-medium">Curated launch content:</strong>{" "}
      final pricing, staff details, memberships, and legal terms remain editable in the centralized content files before activation.
    </div>
  );
}

export function CtaBand({
  eyebrow = "Your next visit",
  title = "Make the chair yours.",
  copy = "Choose a service, preferred barber, or first available chair. The lounge will confirm the final time, service details, and any required deposit.",
}: {
  eyebrow?: string;
  title?: string;
  copy?: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
      <Reveal>
        <div className="relative overflow-hidden border border-[var(--color-brass)]/30 bg-[linear-gradient(135deg,rgba(114,47,55,.18),rgba(184,134,42,.08),rgba(10,10,10,.92))] px-7 py-12 text-center sm:px-12 sm:py-16">
          <div aria-hidden className="absolute inset-0 opacity-25 [background:radial-gradient(circle_at_50%_0%,rgba(212,168,87,.32),transparent_45%)]" />
          <div className="relative">
            <p className="text-[10px] tracking-[.34em] uppercase text-[var(--color-brass)]">{eyebrow}</p>
            <h2 className="font-display mx-auto mt-4 max-w-3xl text-4xl leading-tight text-[var(--color-bone)] sm:text-6xl">{title}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[var(--color-bone-muted)]">{copy}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/book" data-magnetic="true" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-7 py-3.5 text-[11px] tracking-[.22em] uppercase text-[var(--color-ink)] transition hover:bg-[var(--color-brass-light)]">
                Book an appointment <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/walk-ins" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-7 py-3.5 text-[11px] tracking-[.22em] uppercase text-[var(--color-bone)] transition hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]">
                Join walk-in queue
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function TrustStrip() {
  const items = [
    { icon: ShieldCheck, label: "Clear policies" },
    { icon: Clock3, label: "Reserved chair time" },
    { icon: Sparkles, label: "Personal consultation" },
    { icon: MapPin, label: "Northfield, New Jersey" },
  ];
  return (
    <div className="border-y border-[var(--color-ink-line)] bg-black/20">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 sm:px-10 md:grid-cols-4">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex min-h-20 items-center justify-center gap-3 px-3 text-center text-[10px] tracking-[.2em] uppercase text-[var(--color-bone-muted)]">
            <Icon className="h-4 w-4 text-[var(--color-brass)]" aria-hidden /> {label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GalleryExperience() {
  const { lang } = useLang();
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState<(typeof galleryItems)[number] | null>(null);
  const categories = ["all", "interior", "craft", "brand"];
  const visible = galleryItems.filter((item) => category === "all" || item.category === category);
  return (
    <>
      <div className="mb-10 flex flex-wrap gap-2" aria-label="Gallery filters">
        {categories.map((item) => (
          <button key={item} type="button" onClick={() => setCategory(item)} className={clsx("filter-pill", category === item && "filter-pill-active")}>
            {item}
          </button>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item, index) => (
          <Reveal key={item.id} delay={index * 60}>
            <button type="button" onClick={() => setActive(item)} className="group relative block aspect-[4/3] w-full overflow-hidden border border-[var(--color-ink-line)] text-left">
              <Image src={item.src} alt={item.alt[lang]} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
                <div><p className="text-[9px] tracking-[.26em] uppercase text-[var(--color-brass)]">{item.category}</p><h3 className="font-display mt-1 text-xl">{item.title[lang]}</h3></div>
                <ExternalLink className="h-4 w-4 text-[var(--color-brass)]" aria-hidden />
              </div>
            </button>
          </Reveal>
        ))}
      </div>
      {active ? (
        <div role="dialog" aria-modal="true" aria-label={active.title[lang]} className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4" onClick={() => setActive(null)}>
          <button type="button" aria-label="Close image" onClick={() => setActive(null)} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/60"><X /></button>
          <div className="relative h-[75svh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <Image src={active.src} alt={active.alt[lang]} fill sizes="100vw" className="object-contain" priority />
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ReviewGrid() {
  const standards = [
    { title: "Consultation before execution", copy: "Every service begins with a clear conversation about shape, maintenance, timing, and the result you actually want." },
    { title: "Private feedback first", copy: "Concerns should reach management through a direct service-care process, with a documented response and follow-through." },
    { title: "Verified reviews only", copy: "Public testimonials and ratings are shown only when they come from genuine, approved client feedback." },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {standards.map((item, index) => (
        <Reveal key={item.title} delay={index * 75} className="h-full">
          <TiltCard className="h-full">
            <article className="h-full border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/70 p-7">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-brass)]/30 text-[var(--color-brass)]" aria-hidden>0{index + 1}</span>
              <h3 className="font-display mt-6 text-2xl leading-tight text-[var(--color-bone)]">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">{item.copy}</p>
            </article>
          </TiltCard>
        </Reveal>
      ))}
    </div>
  );
}

export function EventOfferGrid() {
  const { lang } = useLang();
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {eventOffers.map((offer, index) => (
        <Reveal key={offer.slug} delay={index * 70}>
          <article className="h-full border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/70 p-7">
            <p className="text-[10px] tracking-[.28em] uppercase text-[var(--color-brass)]">0{index + 1}</p>
            <h2 className="font-display mt-4 text-3xl">{offer.title[lang]}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">{offer.copy[lang]}</p>
            <ul className="mt-6 space-y-3 border-t border-[var(--color-ink-line)] pt-5 text-sm text-[var(--color-bone)]/85">
              {offer.bullets[lang].map((bullet) => <li key={bullet} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brass)]" />{bullet}</li>)}
            </ul>
            <Link href={`/contact?inquiry=${offer.slug}`} className="mt-7 inline-flex items-center gap-2 text-[11px] tracking-[.2em] uppercase text-[var(--color-brass)]">Request a quote <ArrowUpRight className="h-4 w-4" /></Link>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

export function ProductGrid() {
  const { lang } = useLang();
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <Reveal key={product.slug} delay={index * 55}>
          <article className="group h-full border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/70 p-6 transition hover:border-[var(--color-brass)]/45">
            <div className="grid aspect-square place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(184,134,42,.22),rgba(10,10,10,.8)_62%)]"><Gift className="h-14 w-14 text-[var(--color-brass)]" aria-hidden /></div>
            <p className="mt-5 text-[9px] tracking-[.25em] uppercase text-[var(--color-brass)]">{product.category}</p>
            <h3 className="font-display mt-2 text-xl">{product.name[lang]}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-bone-muted)]">{product.copy[lang]}</p>
            <div className="mt-5 flex items-center justify-between border-t border-[var(--color-ink-line)] pt-4"><span className="font-display text-xl">${product.price}</span><span className="text-[9px] tracking-[.18em] uppercase text-amber-200">Preview</span></div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

export function CareerGrid() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {careerRoles.map((role, index) => (
        <Reveal key={role.title} delay={index * 70}>
          <article className="h-full border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/70 p-7">
            <p className="text-[10px] tracking-[.28em] uppercase text-[var(--color-brass)]">{role.type}</p>
            <h2 className="font-display mt-4 text-3xl">{role.title}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">{role.copy}</p>
            <ul className="mt-6 space-y-3 border-t border-[var(--color-ink-line)] pt-5 text-sm text-[var(--color-bone)]/80">
              {role.requirements.map((requirement) => <li key={requirement} className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brass)]" />{requirement}</li>)}
            </ul>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

export function FaqAccordion({ items }: { items: Array<{ question: string; answer: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-[var(--color-ink-line)] border-y border-[var(--color-ink-line)]">
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.question}>
            <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : index)} className="flex w-full items-center justify-between gap-5 py-6 text-left">
              <span className="font-display text-xl text-[var(--color-bone)]">{item.question}</span>
              <ChevronDown className={clsx("h-5 w-5 shrink-0 text-[var(--color-brass)] transition-transform", expanded && "rotate-180")} />
            </button>
            <div className={clsx("grid overflow-hidden transition-[grid-template-rows] duration-500", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}><div className="min-h-0"><p className="max-w-3xl pb-7 text-sm leading-7 text-[var(--color-bone-muted)]">{item.answer}</p></div></div>
          </div>
        );
      })}
    </div>
  );
}

export function InquiryForm({ kind = "general" }: { kind?: "general" | "event" | "career" }) {
  const [status, setStatus] = useState<"idle" | "sent">("idle");
  const [error, setError] = useState("");
  const title = kind === "career" ? "Application interest" : kind === "event" ? "Event inquiry" : "Send a message";
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!String(form.get("name") || "").trim() || !String(form.get("email") || "").includes("@")) {
      setError("Please provide your name and a valid email address.");
      return;
    }
    setError("");
    setStatus("sent");
  }
  if (status === "sent") {
    return <div role="status" className="border border-emerald-700/35 bg-emerald-950/20 p-8"><Check className="h-7 w-7 text-emerald-300" /><h3 className="font-display mt-4 text-2xl">Request prepared.</h3><p className="mt-3 text-sm leading-7 text-[var(--color-bone-muted)]">No request has been sent from this preview form. Please contact {business.email} or {business.phone} to complete your inquiry.</p></div>;
  }
  return (
    <form onSubmit={submit} noValidate className="border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/70 p-6 sm:p-8">
      <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">{title}</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label><span className="form-label">Name</span><input className="form-control" name="name" autoComplete="name" required /></label>
        <label><span className="form-label">Email</span><input className="form-control" name="email" type="email" autoComplete="email" required /></label>
        <label><span className="form-label">Phone</span><input className="form-control" name="phone" type="tel" autoComplete="tel" /></label>
        <label><span className="form-label">Topic</span><select className="form-control" name="topic" defaultValue={kind}><option value="general">General question</option><option value="event">Event or group service</option><option value="career">Career opportunity</option><option value="membership">Membership</option></select></label>
      </div>
      <label className="mt-5 block"><span className="form-label">Message</span><textarea className="form-control min-h-36 resize-y" name="message" required /></label>
      <label className="mt-5 flex items-start gap-3 text-xs leading-6 text-[var(--color-bone-muted)]"><input type="checkbox" required className="mt-1 accent-[var(--color-brass)]" />I consent to being contacted about this request. Marketing consent is handled separately.</label>
      {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
      <button type="submit" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-7 py-3.5 text-[11px] tracking-[.22em] uppercase text-[var(--color-ink)]">Prepare request <ArrowUpRight className="h-4 w-4" /></button>
    </form>
  );
}

export function GiftCardPreview() {
  const amounts = [50, 75, 100, 150];
  const [amount, setAmount] = useState(100);
  return (
    <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
      <div className="relative aspect-[1.6/1] overflow-hidden border border-[var(--color-brass)]/30 bg-[radial-gradient(circle_at_20%_15%,rgba(212,168,87,.3),transparent_35%),linear-gradient(135deg,#17120d,#050505_70%)] p-7 shadow-2xl">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(135deg,transparent_45%,rgba(255,255,255,.18)_50%,transparent_55%)]" />
        <p className="font-display text-2xl">Luxury Barber Lounge</p><p className="mt-2 text-[9px] tracking-[.28em] uppercase text-[var(--color-brass)]">The gift of a reserved chair</p><div className="absolute bottom-7 left-7 font-display text-5xl text-[var(--color-brass-light)]">${amount}</div>
      </div>
      <div>
        <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Choose a preview value</p>
        <div className="mt-5 flex flex-wrap gap-2">{amounts.map((value) => <button type="button" key={value} onClick={() => setAmount(value)} className={clsx("filter-pill", amount === value && "filter-pill-active")}>${value}</button>)}</div>
        <p className="mt-6 text-sm leading-7 text-[var(--color-bone-muted)]">Live purchase and delivery remain hidden until Square gift cards are activated. The production handoff can preserve this design and send buyers to the approved Square checkout.</p>
        <Link href="/contact?inquiry=gift-card" className="mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--color-brass)] px-7 py-3 text-[11px] tracking-[.2em] uppercase text-[var(--color-brass)]">Request a gift card <ArrowUpRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}

export function LocationPanel() {
  return (
    <div className="grid gap-8 border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/65 p-7 md:grid-cols-2 md:p-10">
      <div><p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Northfield, New Jersey</p><h2 className="font-display mt-4 text-4xl">A first-class room, without the pretense.</h2><p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">{business.street}, {business.city}, {business.state} {business.postalCode}. {business.parking.en}</p><div className="mt-7 flex flex-wrap gap-3"><a href={business.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.2em] uppercase text-[var(--color-ink)]"><MapPin className="h-4 w-4" /> Directions</a><a href={business.phoneHref} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-6 py-3 text-[10px] tracking-[.2em] uppercase"><MessageCircle className="h-4 w-4" /> Call</a></div></div>
      <div className="grid min-h-72 place-items-center border border-[var(--color-ink-line)] bg-[radial-gradient(circle_at_50%_40%,rgba(184,134,42,.18),rgba(10,10,10,.8)_65%)] text-center"><div><MapPin className="mx-auto h-10 w-10 text-[var(--color-brass)]" /><p className="font-display mt-4 text-2xl">801 Tilton Road</p><p className="mt-2 text-xs tracking-[.2em] uppercase text-[var(--color-bone-muted)]">Suite 106 · Northfield, NJ</p></div></div>
    </div>
  );
}

export function ServiceMatcher() {
  const [goal, setGoal] = useState("sharp");
  const matches = useMemo(() => {
    const map: Record<string, string[]> = { sharp: ["fade-cut", "hair-shape-up"], transform: ["custom-cut", "hair-coloring"], beard: ["beard-trim", "hot-towel-shave"], care: ["scalp-treatment", "shampoo-conditioning"] };
    return services.filter((service) => (map[goal] ?? []).includes(service.slug)).slice(0, 2);
  }, [goal]);
  return (
    <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr]">
      <div className="border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/65 p-6"><p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">What is the goal?</p><div className="mt-5 space-y-2">{[{v:"sharp",l:"Keep it sharp"},{v:"transform",l:"Create a new look"},{v:"beard",l:"Focus on beard or shave"},{v:"care",l:"Hair or scalp care"}].map((item)=><button key={item.v} type="button" onClick={()=>setGoal(item.v)} className={clsx("choice-card",goal===item.v&&"choice-card-active")}><strong>{item.l}</strong><Sparkles className="h-4 w-4 text-[var(--color-brass)]" /></button>)}</div></div>
      <div className="grid gap-4 sm:grid-cols-2">{matches.map((match)=><article key={match.slug} className="border border-[var(--color-ink-line)] p-6"><p className="text-[9px] tracking-[.25em] uppercase text-[var(--color-brass)]">Recommended</p><h3 className="font-display mt-3 text-2xl">{match.name.en}</h3><p className="mt-3 text-sm leading-6 text-[var(--color-bone-muted)]">{match.blurb.en}</p><div className="mt-5 flex items-center justify-between border-t border-[var(--color-ink-line)] pt-4"><span>${match.from} · {match.minutes} min</span><Link href={`/book?service=${match.slug}`} className="text-[var(--color-brass)]"><ArrowUpRight className="h-4 w-4" /></Link></div></article>)}</div>
    </div>
  );
}
