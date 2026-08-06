"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { business, services } from "@/lib/content/site";
import { features } from "@/lib/config/features";

function answer(input: string) {
  const text = input.toLowerCase();
  if (text.includes("hour") || text.includes("open")) return "The lounge is closed Monday, open Tuesday through Saturday from 8:00 AM to 9:00 PM, and open Sunday from 9:00 AM to 4:00 PM.";
  if (text.includes("address") || text.includes("where") || text.includes("location")) return `${business.street}, ${business.city}, ${business.state} ${business.postalCode}. Complimentary parking is available directly outside.`;
  if (text.includes("walk")) return "Walk-ins are accepted during open business hours, subject to real-time capacity. Barber Lo's is not configured for walk-ins.";
  if (text.includes("beard")) return "The Beard service is 25 minutes and $15. Cut + Beard is 60 minutes and $50. Hot Towel Shave is 40 minutes and $45.";
  if (text.includes("fade")) return "The Skin Fade service is 40 minutes and $50. Available times are shown only for eligible barbers with confirmed schedules.";
  if (text.includes("price") || text.includes("cost")) return "The service menu shows client-confirmed prices and durations. A 50% deposit is required for bookings. Design starts at $150.";
  if (text.includes("book") || text.includes("appointment")) return "Use the Book page to choose a service, an eligible barber, and an available time. A successful reservation returns a booking reference and truthful appointment status.";
  if (text.includes("member")) return "Membership options are shown for comparison. The lounge confirms current benefits, enrollment availability, and terms before activation.";
  const featured = services.filter((service) => service.featured).slice(0, 2).map((service) => service.name.en).join(" or ");
  return `I can help with services, pricing, hours, location, memberships, walk-ins, and booking guidance. A useful place to start is ${featured}.`;
}

export function ConciergeWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileReady, setMobileReady] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    { role: "assistant", text: "Welcome. I can explain services, policies, hours, and help you choose the right booking path. Live availability is never invented." },
  ]);
  const suggestions = useMemo(() => ["Which service fits a fade?", "Where are you located?", "Do you accept walk-ins?"], []);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    let frame = 0;
    const sync = () => {
      frame = 0;
      setMobileReady(!media.matches || window.scrollY > window.innerHeight * 0.62);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    media.addEventListener("change", sync);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", sync);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  function send(value = input) {
    const clean = value.trim();
    if (!clean) return;
    setMessages((current) => [...current, { role: "user", text: clean }, { role: "assistant", text: answer(clean) }]);
    setInput("");
  }
  if (!features.aiConcierge || /^\/(client|barber|reception|admin|kiosk)(?:\/|$)/.test(pathname) || ["/login", "/register", "/forgot-password"].includes(pathname)) return null;
  return (
    <div className={`fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] right-3 z-[55] transition duration-300 md:bottom-5 md:right-5 ${mobileReady ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0 md:pointer-events-auto md:translate-y-0 md:opacity-100"}`}>
      {open ? (
        <section role="dialog" aria-label="Luxury Barber Lounge concierge" className="mb-3 flex h-[min(70svh,560px)] w-[min(calc(100vw-2rem),390px)] flex-col overflow-hidden rounded-2xl border border-[var(--color-brass)]/30 bg-[#0c0c0c] shadow-[0_30px_100px_rgba(0,0,0,.65)]">
          <header className="flex items-center justify-between border-b border-[var(--color-ink-line)] px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-brass)] text-[var(--color-ink)]"><Bot className="h-5 w-5" /></span><div><strong className="block font-display">Lounge Concierge</strong><span className="text-[9px] tracking-[.2em] uppercase text-emerald-300">Approved content only</span></div></div><button type="button" aria-label="Close concierge" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-ink-line)]"><X className="h-4 w-4" /></button></header>
          <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === "assistant" ? "mr-8 rounded-2xl rounded-tl-sm bg-[var(--color-ink-soft)] p-4 text-sm leading-6 text-[var(--color-bone-muted)]" : "ml-8 rounded-2xl rounded-tr-sm bg-[var(--color-brass)] p-4 text-sm leading-6 text-[var(--color-ink)]"}>{message.text}</div>)}</div>
          <div className="border-t border-[var(--color-ink-line)] p-3"><div className="mb-2 flex gap-2 overflow-x-auto pb-1">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => send(suggestion)} className="whitespace-nowrap rounded-full border border-[var(--color-ink-line)] px-3 py-1.5 text-[9px] text-[var(--color-bone-muted)]">{suggestion}</button>)}</div><div className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder="Ask about the lounge" aria-label="Concierge message" className="form-control py-2.5" /><button type="button" onClick={() => send()} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-brass)] text-[var(--color-ink)]"><Send className="h-4 w-4" /></button></div><p className="mt-2 text-[9px] leading-4 text-[var(--color-bone-muted)]">Service guide. <Link href="/contact" className="text-[var(--color-brass)]">Contact a person</Link> for exceptions.</p></div>
        </section>
      ) : null}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open lounge concierge" className="ml-auto grid h-12 w-12 place-items-center rounded-full border border-[var(--color-brass)]/45 bg-[#101010] text-[var(--color-bone)] shadow-xl transition hover:border-[var(--color-brass)] md:flex md:h-13 md:w-auto md:items-center md:gap-2 md:px-4 md:text-[10px] md:tracking-[.18em] md:uppercase"><MessageCircle className="h-4 w-4 text-[var(--color-brass)]" /><span className="sr-only md:not-sr-only">Concierge</span></button>
    </div>
  );
}
