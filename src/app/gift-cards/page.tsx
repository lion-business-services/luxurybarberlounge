import type { Metadata } from "next";
import Link from "next/link";
import { Gift, ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D } from "@/components/motion";
import { LuxuryCard } from "@/components/marketing/LuxuryCard";
import { features } from "@/lib/config/features";

export const metadata: Metadata = { title: "Gift Cards", description: "Give a Luxury Barber Lounge grooming experience." };

export default function GiftCardsPage(){
 const values=[50,75,100,150];
 return <><PageHero eyebrow={{en:"Give the chair",es:"Regala la silla"}} title={{en:"Gift Cards",es:"Tarjetas de Regalo"}} lead={{en:"A thoughtful way to give precision grooming, unhurried service, and time in the lounge.",es:"Una forma especial de regalar grooming de precisión, servicio sin prisa y tiempo en el salón."}}/>
 <Scene3D className="mx-auto max-w-5xl px-6 pb-28 sm:px-10"><Reveal><LuxuryCard className="grid gap-8 p-8 md:grid-cols-[.8fr_1.2fr] md:p-12" elevated><div className="grid min-h-72 place-items-center border border-[var(--color-brass)]/25 bg-black/35"><Gift className="h-20 w-20 text-[var(--color-brass)]"/></div><div><p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Choose an amount</p><h2 className="font-display mt-4 text-4xl">An experience, properly presented.</h2><p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">Digital delivery, recipient message, and Square redemption are prepared behind a feature flag. Until Square Gift Cards is activated, the lounge can issue gift-card requests directly.</p><div className="mt-7 flex flex-wrap gap-3">{values.map(v=><span key={v} className="rounded-full border border-[var(--color-ink-line)] px-5 py-2 text-sm text-[var(--color-bone)]">${v}</span>)}</div><Link href={features.giftCards?"/contact?topic=gift-card":"/contact"} className="mt-8 inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-7 py-3 text-[10px] tracking-[.24em] uppercase text-[var(--color-ink)]">Request a gift card <ArrowUpRight className="h-4 w-4"/></Link></div></LuxuryCard></Reveal></Scene3D></>;
}
