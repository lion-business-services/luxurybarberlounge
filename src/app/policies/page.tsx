import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
const items=[
  ["Booking","/policies/booking","How requests become confirmed appointments."],
  ["Cancellation","/policies/cancellation","Notice windows, late changes, and exceptions."],
  ["Deposits","/policies/deposits","How reservation deposits are applied."],
  ["No-show & late arrival","/policies/no-show","Grace periods, timing, and repeated incidents."],
  ["Refunds","/policies/refund","Service concerns and eligible retail returns."],
  ["Membership","/policies/membership","Draft billing, usage, pause, and cancellation terms."],
] as const;
export const metadata:Metadata={title:"Policies",description:"Booking, cancellation, deposit, no-show, refund, and membership policies.",alternates:{canonical:"/policies"}};
export default function PoliciesPage(){return <><PageHero eyebrow={{en:"Clear before confirmation",es:"Claro antes de confirmar"}} title={{en:"Policies",es:"Políticas"}} lead={{en:"Transparent operating terms protect guest expectations and reserved chair time.",es:"Términos transparentes protegen las expectativas y el tiempo reservado."}}/><main className="mx-auto grid max-w-6xl gap-5 px-6 pb-28 sm:grid-cols-2 sm:px-10 lg:grid-cols-3">{items.map(([title,href,copy],index)=><Link key={href} href={href} className="group border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/65 p-7 transition hover:border-[var(--color-brass)]/45"><p className="text-[9px] tracking-[.24em] uppercase text-[var(--color-brass)]">0{index+1}</p><h2 className="font-display mt-4 text-3xl">{title}</h2><p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">{copy}</p><ArrowUpRight className="mt-7 h-5 w-5 text-[var(--color-brass)] transition group-hover:translate-x-1 group-hover:-translate-y-1"/></Link>)}</main></>}
