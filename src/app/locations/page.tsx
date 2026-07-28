import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { LocationPanel } from "@/components/public/PublicUI";
export const metadata:Metadata={title:"Locations",description:"Visit Luxury Barber Lounge in Northfield, New Jersey.",alternates:{canonical:"/locations"}};
export default function LocationsPage(){return <><PageHero eyebrow={{en:"One room, one standard",es:"Un salón, un estándar"}} title={{en:"Locations",es:"Ubicaciones"}} lead={{en:"The architecture is multi-location ready. Northfield is the confirmed launch location.",es:"La arquitectura está lista para múltiples ubicaciones. Northfield es la ubicación confirmada."}}/><main className="mx-auto max-w-6xl px-6 pb-28 sm:px-10"><LocationPanel/><Link href="/locations/northfield" className="mt-6 inline-flex items-center gap-2 text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">View Northfield details <ArrowUpRight className="h-4 w-4"/></Link></main></>}
