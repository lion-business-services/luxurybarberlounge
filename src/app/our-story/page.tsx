import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Scissors } from "lucide-react";
import { Reveal } from "@/components/motion";
import { business, founderProfile } from "@/lib/content/site";

const ruben = founderProfile;

export const metadata: Metadata = {
  title: "Our Story | Rubén Diaz, Jr.",
  description:
    "Meet Rubén Diaz, Jr. and the purpose behind Luxury Barber Lounge in Northfield, New Jersey: precision grooming, personal service, and a refined room built around the chair.",
  alternates: { canonical: "/our-story" },
  openGraph: {
    title: "Our Story | Luxury Barber Lounge",
    description: "The founder vision, standards, and purpose behind Luxury Barber Lounge.",
    url: `${business.domain}/our-story`,
    images: [{ url: ruben.image.profile, alt: ruben.image.alt.en }],
  },
};

const values = [
  {
    title: "Craft before spectacle",
    body: "The room is designed to feel exceptional, but the standard is still measured in the details of the service: consultation, precision, consistency, and a finish that suits the person in the chair.",
  },
  {
    title: "Hospitality with intention",
    body: "Luxury is not noise. It is being welcomed, understood, and cared for without being rushed. Every touchpoint should make the client feel that their time matters.",
  },
  {
    title: "A team worth returning to",
    body: "The lounge is built around talented professionals who bring individual style to a shared standard. Clients should be able to know their barber, trust the process, and return with confidence.",
  },
];

export default function OurStoryPage() {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Rubén Diaz, Jr.",
    jobTitle: "Founder and Owner",
    worksFor: { "@type": "BarberShop", name: business.name, url: business.domain },
    image: `${business.domain}${ruben.image.profile}`,
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: business.domain },
      { "@type": "ListItem", position: 2, name: "Our Story", item: `${business.domain}/our-story` },
    ],
  };

  return (
    <main className="overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="relative min-h-[78svh] border-b border-[var(--color-ink-line)]">
        <Image
          src={ruben.image.profile}
          alt={ruben.image.alt.en}
          fill
          priority
          sizes="100vw"
          style={{ objectPosition: ruben.image.objectPosition.profile }}
          className="object-cover object-[center_28%] opacity-65 md:object-[72%_30%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,7,.98)_0%,rgba(7,7,7,.84)_45%,rgba(7,7,7,.28)_78%),linear-gradient(180deg,rgba(7,7,7,.25),rgba(7,7,7,.7))]" />
        <div className="relative mx-auto flex min-h-[78svh] max-w-7xl items-end px-6 pb-16 pt-32 sm:px-10 md:items-center md:pb-20">
          <Reveal className="max-w-3xl">
            <p className="text-[10px] tracking-[.34em] uppercase text-[var(--color-brass)]">Founder · Northfield, New Jersey</p>
            <h1 className="font-display mt-6 text-[clamp(3.6rem,10vw,8.8rem)] leading-[.86] tracking-[-.045em]">Built with<br />purpose.</h1>
            <p className="font-display mt-7 max-w-2xl text-xl italic leading-8 text-[var(--color-bone)]/82 sm:text-2xl">
              Rubén Diaz, Jr. created Luxury Barber Lounge around a simple belief: personal grooming deserves the same care, atmosphere, and attention as every other meaningful ritual.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-20 lg:py-32">
        <Reveal>
          <p className="text-[10px] tracking-[.32em] uppercase text-[var(--color-brass)]">The founder vision</p>
          <h2 className="font-display mt-5 text-5xl leading-[.95] sm:text-7xl">A first-class room, centered on the chair.</h2>
        </Reveal>
        <Reveal delay={120} variant="right" className="space-y-7 text-base leading-8 text-[var(--color-bone-muted)] sm:text-lg">
          <p>Luxury Barber Lounge was created to elevate the traditional barbershop experience without losing what makes it personal. The goal is not formality for its own sake. It is a calm, refined environment where excellent work and genuine hospitality belong together.</p>
          <p>Rubén’s role is to protect that standard across the complete client journey: the welcome, the consultation, the service, the follow-through, and the relationship that grows each time a client returns.</p>
          <p>The lounge is also designed as a platform for the barber team. Each professional brings a distinct point of view, while the business provides the structure, atmosphere, and operating discipline required to serve clients consistently.</p>
        </Reveal>
      </section>

      <section className="border-y border-[var(--color-ink-line)] bg-[radial-gradient(circle_at_50%_0%,rgba(184,134,42,.12),transparent_40rem),#0b0b0b] px-6 py-24 sm:px-10 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal className="max-w-3xl">
            <p className="text-[10px] tracking-[.32em] uppercase text-[var(--color-brass)]">The standard</p>
            <h2 className="font-display mt-5 text-5xl leading-[.96] sm:text-7xl">Luxurious. Refined. Distinctive.</h2>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {values.map((value, index) => (
              <Reveal key={value.title} delay={index * 90} className="border border-[var(--color-brass)]/20 bg-black/35 p-7 sm:p-9">
                <span className="text-[10px] tracking-[.28em] text-[var(--color-brass)]">0{index + 1}</span>
                <h3 className="font-display mt-7 text-3xl">{value.title}</h3>
                <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">{value.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-24 sm:px-10 lg:grid-cols-2 lg:items-center lg:gap-20 lg:py-32">
        <Reveal className="relative aspect-[4/5] overflow-hidden border border-[var(--color-brass)]/25 bg-[#0b0b0b]">
          <Image src={ruben.image.profile} alt={ruben.image.alt.en} fill sizes="(max-width: 1024px) 100vw, 50vw" style={{ objectPosition: ruben.image.objectPosition.profile }} className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          <div className="absolute inset-x-6 bottom-6">
            <p className="text-[10px] tracking-[.28em] uppercase text-[var(--color-brass)]">Rubén Diaz, Jr.</p>
            <p className="font-display mt-2 text-2xl italic">Founder and Owner</p>
          </div>
        </Reveal>
        <Reveal delay={100} variant="right">
          <p className="text-[10px] tracking-[.32em] uppercase text-[var(--color-brass)]">A message from Rubén</p>
          <blockquote className="font-display mt-7 text-3xl italic leading-[1.28] text-[var(--color-bone)] sm:text-5xl">
            “This lounge is about how people feel when they sit down, and how they carry themselves when they stand back up.”
          </blockquote>
          <p className="mt-7 text-base leading-8 text-[var(--color-bone-muted)]">
            Every detail is intended to earn trust: a beautiful environment, a prepared team, clear communication, and a service experience that respects the client’s individual style.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/barbers" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-6 py-3 text-[10px] tracking-[.18em] uppercase transition hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"><Scissors className="h-4 w-4" /> Meet the barbers</Link>
            <Link href="/book" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)]"><CalendarDays className="h-4 w-4" /> Book your experience</Link>
          </div>
        </Reveal>
      </section>

      <section className="border-t border-[var(--color-ink-line)] px-6 py-20 text-center sm:px-10">
        <Reveal className="mx-auto max-w-3xl">
          <MapPin className="mx-auto h-6 w-6 text-[var(--color-brass)]" />
          <p className="mt-5 text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Northfield community</p>
          <h2 className="font-display mt-5 text-4xl sm:text-6xl">A local destination built to be worth the return.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-[var(--color-bone-muted)]">Visit the lounge at {business.street}, {business.city}, {business.state} {business.postalCode}.</p>
          <Link href="/visit" className="mt-8 inline-flex items-center gap-2 text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Plan your visit <ArrowRight className="h-4 w-4" /></Link>
        </Reveal>
      </section>
    </main>
  );
}
