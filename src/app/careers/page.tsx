import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { CareerGrid, InquiryForm } from "@/components/public/PublicUI";
export const metadata: Metadata = { title: "Careers", description: "Explore barber, reception, and development opportunities at Luxury Barber Lounge.", alternates: { canonical: "/careers" } };
export default function CareersPage(){return <><PageHero eyebrow={{en:"Join the room",es:"Únete al salón"}} title={{en:"Careers",es:"Carreras"}} lead={{en:"For professionals who value consultation, detail, hospitality, and a standard worth protecting.",es:"Para profesionales que valoran consulta, detalle, hospitalidad y un estándar que merece cuidado."}}/><main className="mx-auto max-w-6xl px-6 pb-28 sm:px-10"><CareerGrid/><div className="mt-16 max-w-3xl"><InquiryForm kind="career"/></div></main></>}
