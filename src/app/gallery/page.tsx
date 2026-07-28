import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { CtaBand, GalleryExperience } from "@/components/public/PublicUI";
export const metadata: Metadata = { title: "Gallery", description: "Explore the Luxury Barber Lounge atmosphere, craftsmanship, tools, and brand experience.", alternates: { canonical: "/gallery" } };
export default function GalleryPage(){return <><PageHero eyebrow={{en:"The visual journal",es:"El diario visual"}} title={{en:"Gallery",es:"Galería"}} lead={{en:"A cinematic look at the room, the tools, and the standards behind every chair.",es:"Una mirada cinematográfica al espacio, las herramientas y los estándares de cada silla."}}/><main className="mx-auto max-w-6xl px-6 pb-28 sm:px-10"><GalleryExperience/></main><CtaBand /></>}
