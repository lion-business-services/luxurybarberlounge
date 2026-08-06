import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D, TiltCard } from "@/components/motion";
import { packages } from "@/lib/content/site";

export const metadata: Metadata = { title: "Grooming Packages", description: "Executive Grooming, Father and Son, and Wedding or Event packages from the final client intake." };

export default function PackagesPage() {
  return <>
    <PageHero eyebrow={{en:"Curated combinations",es:"Combinaciones seleccionadas"}} title={{en:"Grooming Packages",es:"Paquetes de Grooming"}} lead={{en:"Coordinated services for complete maintenance, important occasions, and private appointments.",es:"Servicios coordinados para mantenimiento completo, ocasiones importantes y citas privadas."}} />
    <Scene3D className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
      <div className="grid gap-6 md:grid-cols-2">
        {packages.map((item,index)=><Reveal key={item.slug} delay={index*70}><TiltCard max={4} className="h-full"><article className="flex h-full flex-col border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)] p-8">
          <p className="text-[9px] tracking-[.3em] uppercase text-[var(--color-brass)]">Package 0{index+1}</p>
          <h2 className="font-display mt-4 text-3xl">{item.name.en}</h2>
          <p className="mt-4 flex-1 text-sm leading-7 text-[var(--color-bone-muted)]">{item.description.en}</p>
          <div className="mt-7 flex items-center justify-end border-t border-[var(--color-ink-line)] pt-5"><span className="font-display text-xl text-[var(--color-brass)]">${item.from}</span></div>
          <Link href={`/book?package=${item.slug}`} className="mt-6 inline-flex items-center justify-center gap-3 rounded-full border border-[var(--color-brass)]/45 px-6 py-3 text-[10px] tracking-[.24em] uppercase text-[var(--color-brass)] hover:bg-[var(--color-brass)] hover:text-[var(--color-ink)]">Request this package <ArrowUpRight className="h-4 w-4"/></Link>
        </article></TiltCard></Reveal>)}
      </div>
    </Scene3D>
  </>;
}
