import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { EventOfferGrid, InquiryForm } from "@/components/public/PublicUI";
export const metadata: Metadata = { title: "Events & Group Grooming", description: "Wedding, corporate, editorial, and private group grooming requests.", alternates: { canonical: "/events" } };
export default function EventsPage(){return <><PageHero eyebrow={{en:"Planned together",es:"Planeado en conjunto"}} title={{en:"Events & Group Grooming",es:"Eventos y Grooming Grupal"}} lead={{en:"Coordinated chair time for weddings, productions, executive events, and private lounge requests.",es:"Tiempo coordinado para bodas, producciones, eventos ejecutivos y experiencias privadas."}}/><main className="mx-auto max-w-6xl px-6 pb-28 sm:px-10"><EventOfferGrid/><div className="mt-16 max-w-3xl"><InquiryForm kind="event"/></div></main></>}
