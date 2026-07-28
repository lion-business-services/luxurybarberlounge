import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WalkInFlow } from "@/components/queue/WalkInFlow";
export const metadata={title:"Kiosk Check-In",robots:{index:false,follow:false}};
export default function Page(){return <main className="min-h-screen bg-[#090909] px-5 py-8 sm:px-10"><Link href="/kiosk" className="inline-flex items-center gap-2 text-[11px] tracking-[.2em] uppercase text-[var(--color-brass)]"><ArrowLeft className="h-4 w-4"/> Back</Link><header className="mx-auto max-w-3xl pb-8 pt-10 text-center"><p className="text-[11px] tracking-[.28em] uppercase text-[var(--color-brass)]">Private check-in</p><h1 className="font-display mt-4 text-4xl sm:text-6xl">Tell us what brings you in.</h1></header><WalkInFlow kiosk/></main>}
