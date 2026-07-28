"use client";
import { PageHero } from "@/components/PageHero";
import { CtaBand, FaqAccordion } from "@/components/public/PublicUI";
import { faqs } from "@/lib/content/site";
import { useLang } from "@/lib/i18n/context";
export default function FaqPage(){const {lang}=useLang(); return <><PageHero eyebrow={{en:"Before the chair",es:"Antes de la silla"}} title={{en:"Frequently Asked Questions",es:"Preguntas Frecuentes"}} lead={{en:"Clear answers about booking, services, walk-ins, memberships, and accessibility.",es:"Respuestas claras sobre reservas, servicios, walk-ins, membresías y accesibilidad."}}/><main className="mx-auto max-w-5xl px-6 pb-28 sm:px-10"><FaqAccordion items={faqs.map((item)=>({question:item.question[lang],answer:item.answer[lang]}))}/></main><CtaBand title="Still need a human answer?" copy="Call, email, or send a concise request. The team can confirm exceptions that a website should not guess." /></>}
