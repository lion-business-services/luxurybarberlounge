"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";

type Section = "services"|"barbers"|"membership"|"visit"|"about";
const details: Record<Section, {eyebrow:string; items:string[]}> = {
 services:{eyebrow:"The menu",items:["Executive cuts","Precision fades","Beard rituals","Premium combinations"]},
 barbers:{eyebrow:"The chairs",items:["Specialty profiles","Portfolio work","Direct availability","Favorite barber"]},
 membership:{eyebrow:"The private list",items:["Standing reservations","Member pricing","Priority access","Grooming cadence"]},
 visit:{eyebrow:"The lounge",items:["Hours & location","Parking guidance","Walk-in queue","Accessibility"]},
 about:{eyebrow:"The standard",items:["Craftsmanship","Hospitality","Precision","Consistency"]},
};
export function StubPage({section}:{section:Section}){const {lang}=useLang();const d=details[section];return <main className="mx-auto max-w-6xl px-6 py-24 sm:px-10"><p className="section-kicker">{d.eyebrow}</p><h1 className="section-title">{dict.stub[section].title[lang]}</h1><p className="section-copy">{dict.stub[section].body[lang]}</p><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{d.items.map((item,i)=><article className="service-card" key={item}><span className="service-index">0{i+1}</span><h3>{item}</h3><p>This experience is structured, responsive, and ready for final business content and live Square data.</p></article>)}</div><div className="mt-10 flex flex-wrap gap-4"><Link href="/book" className="gold-button">Reserve now <ArrowUpRight/></Link><Link href="/" className="outline-button">Return home</Link></div></main>}
