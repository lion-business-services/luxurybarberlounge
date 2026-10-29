"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, CalendarCheck, CreditCard, Loader2, RotateCcw, Scissors, X } from "lucide-react";
import { features } from "@/lib/config/features";
import { businessConfig } from "@/lib/config/business";
import { useLang } from "@/lib/i18n/context";
import { CONCIERGE_NAME, CONCIERGE_ROLE } from "@/lib/concierge/identity";
import type { Block, BookingSummary, Chip, Choice, ConciergeState } from "@/lib/concierge/engine";
import type { AvailabilitySlot, BookingConfirmation } from "@/lib/booking/types";

/**
 * Sterling, the booking concierge.
 *
 * The conversation itself runs on the server (/api/concierge), which answers
 * from the live catalog and the one availability engine. This window only
 * shows it, collects the client's contact details, and then books through the
 * same /api/booking/submit route and opens the same Square checkout as the
 * booking page. Contact details go straight to the booking route and never
 * through the conversation.
 */

type Lang = "en" | "es";

type Entry =
  | { id: string; role: "assistant"; blocks: Block[] }
  | { id: string; role: "user"; text: string }
  | { id: string; role: "booking"; summary: BookingSummary }
  | { id: string; role: "reserved"; confirmation: BookingConfirmation; summary: BookingSummary };

type Contact = { firstName: string; lastName: string; email: string; phone: string; notes: string; emailConsent: boolean; smsConsent: boolean; policyAccepted: boolean };

type Saved = { entries: Entry[]; chips: Chip[]; state: ConciergeState; contact?: Partial<Contact> };

const STORAGE_KEY = "lbl.concierge.v1";
const EMPTY_CONTACT: Contact = { firstName: "", lastName: "", email: "", phone: "", notes: "", emailConsent: true, smsConsent: false, policyAccepted: false };

const T = {
  open: { en: `Book with ${CONCIERGE_NAME}`, es: `Reserva con ${CONCIERGE_NAME}` },
  live: { en: "Live times", es: "Horarios en vivo" },
  placeholder: { en: "Ask anything or say “haircut Friday at 3”", es: "Pregunta o escribe “corte el viernes a las 3”" },
  restart: { en: "Start over", es: "Empezar de nuevo" },
  close: { en: "Close", es: "Cerrar" },
  footer: { en: "Times come from the lounge's live schedule. Prefer a person?", es: "Los horarios vienen de la agenda en vivo. ¿Prefieres hablar con alguien?" },
  call: { en: "Call", es: "Llama al" },
  error: { en: `I couldn't reach the lounge just now. Please try again, or call ${businessConfig.phone}.`, es: `No pude comunicarme con la barbería. Intenta de nuevo o llama al ${businessConfig.phone}.` },
  details: { en: "Your details", es: "Tus datos" },
  first: { en: "First name", es: "Nombre" },
  last: { en: "Last name", es: "Apellido" },
  email: { en: "Email", es: "Correo" },
  phone: { en: "Mobile phone", es: "Celular" },
  notes: { en: "Anything the barber should know? (optional)", es: "¿Algo que el barbero deba saber? (opcional)" },
  emailConsent: { en: "Email me confirmations and updates.", es: "Envíame confirmaciones y novedades por correo." },
  smsConsent: { en: "Text me appointment updates. Message and data rates may apply.", es: "Envíame avisos por mensaje de texto. Pueden aplicar cargos." },
  policy: { en: "I acknowledge the booking, cancellation, and no-show policy.", es: "Acepto la política de reservas, cancelación e inasistencia." },
  policyLink: { en: "Read it", es: "Leer" },
  reserve: { en: "Reserve and pay with Square", es: "Reservar y pagar con Square" },
  reserving: { en: "Reserving your time…", es: "Reservando tu hora…" },
  total: { en: "Total today", es: "Total hoy" },
  fee: { en: "plus a 4% service fee at checkout. Nothing more is due at the chair.", es: "más un cargo por servicio de 4% al pagar. No se debe nada más en la silla." },
  missing: { en: "Please fill in your name, a valid email and a 10 digit phone number, and accept the policy.", es: "Completa tu nombre, un correo válido y un teléfono de 10 dígitos, y acepta la política." },
  reservedTitle: { en: "Your time is reserved", es: "Tu hora está reservada" },
  reservedBody: { en: "Pay with Square to confirm it. The time is held for you for 15 minutes.", es: "Paga con Square para confirmarla. La hora queda apartada por 15 minutos." },
  pay: { en: "Pay with Square", es: "Pagar con Square" },
  opening: { en: "Opening Square checkout…", es: "Abriendo el pago de Square…" },
  view: { en: "View booking", es: "Ver reserva" },
  paid: { en: "This booking is already paid and confirmed.", es: "Esta reserva ya está pagada y confirmada." },
  taken: { en: "That time was just taken. Here are the closest open times:", es: "Esa hora se acaba de ocupar. Estos son los horarios más cercanos:" },
  reference: { en: "Reference", es: "Referencia" },
} as const;

function t(key: keyof typeof T, lang: Lang) {
  return T[key][lang];
}

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function when(iso: string, timeZone: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { timeZone, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function clock(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function readSaved(): Saved | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function writeSaved(value: Saved) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private windows and blocked storage: the chat still works, it just isn't kept between pages.
  }
}

export function ConciergeWidget() {
  const pathname = usePathname();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [mobileReady, setMobileReady] = useState(false);
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [state, setState] = useState<ConciergeState>({ mode: "idle", draft: {} });
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [restored, setRestored] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const field = useRef<HTMLInputElement | null>(null);

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

  // The conversation follows the client from page to page during the visit.
  useEffect(() => {
    const saved = readSaved();
    const timer = window.setTimeout(() => {
      if (saved?.entries?.length) {
        setEntries(saved.entries);
        setChips(saved.chips ?? []);
        setState(saved.state ?? { mode: "idle", draft: {} });
        if (saved.contact) setContact((current) => ({ ...current, ...saved.contact, policyAccepted: false }));
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!restored) return;
    const { firstName, lastName, email, phone } = contact;
    writeSaved({ entries: entries.slice(-60), chips, state, contact: { firstName, lastName, email, phone } });
  }, [restored, entries, chips, state, contact]);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [entries, chips, busy, open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    const focus = window.setTimeout(() => field.current?.focus({ preventScroll: true }), 60);
    return () => { window.removeEventListener("keydown", close); window.clearTimeout(focus); };
  }, [open]);

  const talk = useCallback(async (body: { text?: string; choice?: Choice; start?: boolean }, echo?: string) => {
    if (echo) setEntries((current) => [...current, { id: uid(), role: "user", text: echo }]);
    setChips([]);
    setBusy(true);
    try {
      const response = await fetch("/api/concierge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, state, language: lang }) });
      const result = (await response.json().catch(() => null)) as ({ ok: boolean; message?: string; blocks?: Block[]; chips?: Chip[]; state?: ConciergeState; booking?: BookingSummary }) | null;
      if (!response.ok || !result?.ok) {
        setEntries((current) => [...current, { id: uid(), role: "assistant", blocks: [{ kind: "text", text: result?.message ?? t("error", lang) }] }]);
        return;
      }
      const next: Entry[] = [{ id: uid(), role: "assistant", blocks: result.blocks ?? [] }];
      if (result.booking) next.push({ id: uid(), role: "booking", summary: result.booking });
      setEntries((current) => [...current.filter((entry) => entry.role !== "booking"), ...next]);
      setChips(result.chips ?? []);
      if (result.state) setState(result.state);
    } catch {
      setEntries((current) => [...current, { id: uid(), role: "assistant", blocks: [{ kind: "text", text: t("error", lang) }] }]);
    } finally {
      setBusy(false);
    }
  }, [lang, state]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !entries.length && !busy) void talk({ start: true });
  }

  function send(event?: FormEvent) {
    event?.preventDefault();
    const clean = input.trim();
    if (!clean || busy) return;
    setInput("");
    void talk({ text: clean }, clean);
  }

  function choose(chip: Chip) {
    if (busy) return;
    void talk({ choice: chip.choice }, chip.label);
  }

  function restart() {
    setEntries([]);
    setChips([]);
    setState({ mode: "idle", draft: {} });
    void talk({ start: true });
  }

  /** Shows real open times returned by the booking route when a time was taken a moment ago. */
  function offerAlternatives(alternatives: AvailabilitySlot[], timeZone: string) {
    const unique = alternatives.filter((slot, index, all) => all.findIndex((other) => other.startsAt === slot.startsAt) === index).slice(0, 8);
    setEntries((current) => [...current.filter((entry) => entry.role !== "booking"), { id: uid(), role: "assistant", blocks: [{ kind: "text", text: t("taken", lang) }] }]);
    setChips(unique.map((slot) => ({ label: `${new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(new Date(slot.startsAt))} ${clock(slot.startsAt, timeZone)} · ${slot.barberName.split(/[\s,]+/)[0]}`, choice: { type: "slot", startsAt: slot.startsAt, barberId: slot.barberId } })));
  }

  if (!features.aiConcierge || /^\/(client|barber|reception|admin|kiosk)(?:\/|$)/.test(pathname) || ["/login", "/register", "/forgot-password"].includes(pathname)) return null;

  const language = lang === "es" ? "es" : "en";
  const lastAssistant = [...entries].reverse().find((entry) => entry.role === "assistant")?.id;

  return (
    <div className={`fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] right-3 z-[55] transition duration-300 md:bottom-5 md:right-5 ${mobileReady || open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0 md:pointer-events-auto md:translate-y-0 md:opacity-100"}`}>
      {open ? (
        <section role="dialog" aria-label={`${CONCIERGE_NAME}, ${CONCIERGE_ROLE[language]}`} className="mb-3 flex h-[min(78svh,660px)] w-[min(calc(100vw-1.5rem),410px)] flex-col overflow-hidden rounded-2xl border border-[var(--color-brass)]/35 bg-[#0b0b0b] shadow-[0_30px_100px_rgba(0,0,0,.7)]">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--color-ink-line)] bg-gradient-to-b from-[#141210] to-[#0b0b0b] px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-brass)] text-[var(--color-ink)]"><Scissors className="h-[18px] w-[18px]" /><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0b0b0b] bg-emerald-400" aria-hidden="true" /></span>
              <div className="min-w-0">
                <strong className="block font-display text-lg leading-tight">{CONCIERGE_NAME}</strong>
                <span className="block truncate text-[9px] uppercase tracking-[.18em] text-[var(--color-brass-light)]">{CONCIERGE_ROLE[language]} · {t("live", language)}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button type="button" onClick={restart} disabled={busy} aria-label={t("restart", language)} title={t("restart", language)} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-ink-line)] text-[var(--color-bone-muted)] hover:text-[var(--color-bone)] disabled:opacity-40"><RotateCcw className="h-4 w-4" /></button>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("close", language)} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-ink-line)]"><X className="h-4 w-4" /></button>
            </div>
          </header>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4" aria-live="polite">
            {entries.map((entry) => {
              if (entry.role === "user") return <div key={entry.id} className="ml-10 w-fit max-w-[85%] justify-self-end rounded-2xl rounded-tr-sm bg-[var(--color-brass)] px-4 py-2.5 text-sm leading-6 text-[var(--color-ink)] [margin-left:auto]">{entry.text}</div>;
              if (entry.role === "assistant") return <AssistantMessage key={entry.id} blocks={entry.blocks} />;
              if (entry.role === "booking") return <BookingCard key={entry.id} summary={entry.summary} lang={language} contact={contact} setContact={setContact} onTaken={offerAlternatives} onReserved={(confirmation) => setEntries((current) => [...current.filter((item) => item.id !== entry.id), { id: uid(), role: "reserved", confirmation, summary: entry.summary }])} />;
              return <ReservedCard key={entry.id} confirmation={entry.confirmation} summary={entry.summary} lang={language} />;
            })}
            {busy ? <div className="mr-10 flex w-fit items-center gap-1.5 rounded-2xl rounded-tl-sm bg-[var(--color-ink-soft)] px-4 py-3" aria-label="Typing"><span className="h-1.5 w-1.5 rounded-full bg-[var(--color-bone-muted)] motion-safe:animate-pulse" /><span className="h-1.5 w-1.5 rounded-full bg-[var(--color-bone-muted)] motion-safe:animate-pulse [animation-delay:150ms]" /><span className="h-1.5 w-1.5 rounded-full bg-[var(--color-bone-muted)] motion-safe:animate-pulse [animation-delay:300ms]" /></div> : null}
            {!busy && chips.length && lastAssistant ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {chips.map((chip, index) => (
                  <button key={`${chip.label}-${index}`} type="button" onClick={() => choose(chip)} className={`rounded-full px-3.5 py-2 text-left text-xs leading-4 transition ${chip.primary ? "bg-[var(--color-brass)] font-medium text-[var(--color-ink)] hover:brightness-110" : "border border-[var(--color-brass)]/35 text-[var(--color-bone)] hover:border-[var(--color-brass)] hover:bg-[var(--color-brass)]/10"}`}>{chip.label}</button>
                ))}
              </div>
            ) : null}
          </div>

          <form onSubmit={send} className="border-t border-[var(--color-ink-line)] p-3">
            <div className="flex gap-2">
              <input ref={field} value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("placeholder", language)} aria-label={`Message ${CONCIERGE_NAME}`} maxLength={600} className="form-control py-2.5 text-sm" />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-brass)] text-[var(--color-ink)] disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-[var(--color-bone-muted)]">{t("footer", language)} <a href={businessConfig.phoneHref} className="text-[var(--color-brass)]">{t("call", language)} {businessConfig.phone}</a></p>
          </form>
        </section>
      ) : null}
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={t("open", language)} className="ml-auto flex h-12 items-center gap-2 rounded-full border border-[var(--color-brass)]/55 bg-[#101010] px-3 text-[var(--color-bone)] shadow-xl transition hover:border-[var(--color-brass)] md:h-13 md:px-4">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-brass)] text-[var(--color-ink)]"><CalendarCheck className="h-4 w-4" /></span>
        <span className="hidden text-[10px] uppercase tracking-[.18em] md:inline">{t("open", language)}</span>
      </button>
    </div>
  );
}

function AssistantMessage({ blocks }: { blocks: Block[] }) {
  return (
    <div className="mr-8 space-y-2.5 rounded-2xl rounded-tl-sm bg-[var(--color-ink-soft)] px-4 py-3 text-sm leading-6 text-[var(--color-bone)]">
      {blocks.map((block, index) => {
        if (block.kind === "text") return <p key={index}>{block.text}</p>;
        if (block.kind === "list") {
          return (
            <ul key={index} className="divide-y divide-white/[.06] rounded-xl border border-white/[.06] bg-black/20">
              {block.items.map((item, row) => (
                <li key={row} className="px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3"><strong className="text-[13px] font-medium">{item.title}</strong>{item.meta ? <span className="shrink-0 text-right text-[11px] tabular-nums text-[var(--color-brass-light)]">{item.meta}</span> : null}</div>
                  {item.detail ? <p className="mt-0.5 text-xs leading-5 text-[var(--color-bone-muted)]">{item.detail}</p> : null}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <div key={index} className="flex flex-wrap gap-2">
            {block.links.map((link) => link.href.startsWith("/")
              ? <Link key={link.href} href={link.href} className="rounded-full border border-[var(--color-brass)]/40 px-3 py-1.5 text-xs text-[var(--color-brass-light)] hover:border-[var(--color-brass)]">{link.label}</Link>
              : <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="rounded-full border border-[var(--color-brass)]/40 px-3 py-1.5 text-xs text-[var(--color-brass-light)] hover:border-[var(--color-brass)]">{link.label}</a>)}
          </div>
        );
      })}
    </div>
  );
}

function SummaryRows({ summary, lang }: { summary: BookingSummary; lang: Lang }) {
  return (
    <dl className="grid gap-1.5 text-xs">
      <div className="flex justify-between gap-3"><dt className="text-[var(--color-bone-muted)]">{lang === "es" ? "Servicio" : "Service"}</dt><dd className="text-right">{summary.serviceName}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-[var(--color-bone-muted)]">{lang === "es" ? "Barbero" : "Barber"}</dt><dd className="text-right">{summary.barberName}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-[var(--color-bone-muted)]">{lang === "es" ? "Cuándo" : "When"}</dt><dd className="text-right">{when(summary.startsAt, summary.timezone, lang)}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-[var(--color-bone-muted)]">{lang === "es" ? "Duración" : "Length"}</dt><dd className="text-right">{summary.durationMinutes} min</dd></div>
      {summary.familyItems.length ? <div className="rounded-lg bg-black/25 p-2">{summary.familyItems.map((item) => <div key={item.label} className="flex justify-between gap-3 text-[11px] text-[var(--color-bone-muted)]"><span>{item.label} · {item.serviceName}</span><span className="tabular-nums">{item.minutes} min · {money(item.priceCents)}</span></div>)}</div> : null}
    </dl>
  );
}

function BookingCard({ summary, lang, contact, setContact, onTaken, onReserved }: {
  summary: BookingSummary;
  lang: Lang;
  contact: Contact;
  setContact: (update: (current: Contact) => Contact) => void;
  onTaken: (alternatives: AvailabilitySlot[], timeZone: string) => void;
  onReserved: (confirmation: BookingConfirmation) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const idempotencyKey = useRef(uid());
  const set = <K extends keyof Contact>(key: K, value: Contact[K]) => setContact((current) => ({ ...current, [key]: value }));
  const valid = contact.firstName.trim() && contact.lastName.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email.trim()) && contact.phone.replace(/\D/g, "").length >= 10 && contact.policyAccepted;

  async function reserve(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!valid) { setError(t("missing", lang)); return; }
    setSubmitting(true); setError(""); setFieldErrors({});
    const params = new URLSearchParams(window.location.search);
    try {
      const response = await fetch("/api/booking/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: summary.serviceId,
          serviceSlug: summary.serviceSlug,
          addonIds: [],
          familyChildren: summary.familyChildren ?? undefined,
          barberId: summary.barberId,
          barberSlug: summary.barberSlug || null,
          firstAvailable: summary.firstAvailable,
          locationId: summary.locationId,
          startsAt: summary.startsAt,
          firstName: contact.firstName.trim(),
          lastName: contact.lastName.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          preferredLanguage: lang,
          existingClient: "unsure",
          notes: contact.notes.trim(),
          emailConsent: contact.emailConsent,
          smsConsent: contact.smsConsent,
          policyAccepted: true,
          policyVersion: businessConfig.bookingPolicyVersion,
          idempotencyKey: idempotencyKey.current,
          source: params.get("utm_source") === "business_card" ? "qr_business_card" : "website",
          campaignSource: params.get("utm_source"),
          campaignMedium: params.get("utm_medium"),
          campaignName: params.get("utm_campaign"),
          referralSource: params.get("ref"),
          pageUrl: window.location.href,
          company: "",
        }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; confirmation?: BookingConfirmation; message?: string; fields?: Record<string, string[]>; alternatives?: AvailabilitySlot[] } | null;
      if (!response.ok || !result?.confirmation) {
        if (result?.alternatives?.length) { onTaken(result.alternatives, summary.timezone); return; }
        if (result?.fields) setFieldErrors(result.fields);
        setError(result?.message ?? t("error", lang));
        return;
      }
      onReserved(result.confirmation);
    } catch {
      setError(t("error", lang));
    } finally {
      setSubmitting(false);
    }
  }

  const input = (key: "firstName" | "lastName" | "email" | "phone", label: string, type: string, autoComplete: string) => (
    <label className="grid gap-1 text-[10px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">
      {label}
      <input value={contact[key]} onChange={(event) => set(key, event.target.value)} type={type} autoComplete={autoComplete} required className="form-control py-2 text-sm normal-case tracking-normal" />
      {fieldErrors[key]?.length ? <span className="normal-case tracking-normal text-red-300">{fieldErrors[key][0]}</span> : null}
    </label>
  );

  return (
    <form onSubmit={reserve} className="mr-2 space-y-3 rounded-2xl border border-[var(--color-brass)]/35 bg-[#100f0d] p-4">
      <SummaryRows summary={summary} lang={lang} />
      <div className="flex items-baseline justify-between border-t border-white/[.08] pt-2"><span className="text-[10px] uppercase tracking-[.14em] text-[var(--color-brass)]">{t("total", lang)}</span><span className="font-display text-2xl">{money(summary.priceCents)}</span></div>
      <p className="-mt-1 text-[11px] leading-4 text-[var(--color-bone-muted)]">{t("fee", lang)}</p>
      <p className="pt-1 text-[10px] uppercase tracking-[.16em] text-[var(--color-brass)]">{t("details", lang)}</p>
      <div className="grid grid-cols-2 gap-2">{input("firstName", t("first", lang), "text", "given-name")}{input("lastName", t("last", lang), "text", "family-name")}</div>
      {input("email", t("email", lang), "email", "email")}
      {input("phone", t("phone", lang), "tel", "tel")}
      <label className="grid gap-1 text-[10px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{t("notes", lang)}<input value={contact.notes} onChange={(event) => set("notes", event.target.value.slice(0, 500))} className="form-control py-2 text-sm normal-case tracking-normal" /></label>
      <div className="space-y-1.5 text-[11px] leading-4 text-[var(--color-bone-muted)]">
        <label className="flex items-start gap-2"><input type="checkbox" checked={contact.emailConsent} onChange={(event) => set("emailConsent", event.target.checked)} className="mt-0.5 accent-[var(--color-brass)]" />{t("emailConsent", lang)}</label>
        <label className="flex items-start gap-2"><input type="checkbox" checked={contact.smsConsent} onChange={(event) => set("smsConsent", event.target.checked)} className="mt-0.5 accent-[var(--color-brass)]" />{t("smsConsent", lang)}</label>
        <label className="flex items-start gap-2 text-[var(--color-bone)]"><input type="checkbox" checked={contact.policyAccepted} onChange={(event) => set("policyAccepted", event.target.checked)} required className="mt-0.5 accent-[var(--color-brass)]" /><span>{t("policy", lang)} <Link href="/policies" target="_blank" className="text-[var(--color-brass)] underline underline-offset-2">{t("policyLink", lang)}</Link></span></label>
      </div>
      {error ? <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-2.5 text-xs leading-5 text-red-100">{error}</p> : null}
      <button type="submit" disabled={submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brass)] px-5 text-[11px] font-medium uppercase tracking-[.14em] text-[var(--color-ink)] disabled:opacity-60">{submitting ? <><Loader2 className="h-4 w-4 motion-safe:animate-spin" />{t("reserving", lang)}</> : <><CreditCard className="h-4 w-4" />{t("reserve", lang)}</>}</button>
    </form>
  );
}

function ReservedCard({ confirmation, summary, lang }: { confirmation: BookingConfirmation; summary: BookingSummary; lang: Lang }) {
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const manageUrl = `/booking/confirmation/${encodeURIComponent(confirmation.reference)}?token=${encodeURIComponent(confirmation.manageToken)}`;

  async function pay() {
    setPaying(true); setMessage("");
    try {
      const response = await fetch("/api/booking/payment-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reference: confirmation.reference, token: confirmation.manageToken }) });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; url?: string; paid?: boolean; message?: string } | null;
      if (result?.paid) { setMessage(t("paid", lang)); setPaying(false); return; }
      if (!response.ok || !result?.ok || !result.url) { setMessage(result?.message ?? t("error", lang)); setPaying(false); return; }
      window.location.assign(result.url);
    } catch {
      setMessage(t("error", lang));
      setPaying(false);
    }
  }

  return (
    <div className="mr-2 space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/[.04] p-4">
      <div>
        <p className="text-[10px] uppercase tracking-[.16em] text-emerald-300">{t("reservedTitle", lang)}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--color-bone-muted)]">{t("reservedBody", lang)}</p>
      </div>
      <SummaryRows summary={summary} lang={lang} />
      <div className="flex items-baseline justify-between border-t border-white/[.08] pt-2"><span className="text-[10px] uppercase tracking-[.14em] text-[var(--color-brass)]">{t("reference", lang)}</span><span className="font-mono text-xs">{confirmation.reference}</span></div>
      <button type="button" onClick={() => void pay()} disabled={paying} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brass)] px-5 text-[11px] font-medium uppercase tracking-[.14em] text-[var(--color-ink)] disabled:opacity-60">{paying ? <><Loader2 className="h-4 w-4 motion-safe:animate-spin" />{t("opening", lang)}</> : <><CreditCard className="h-4 w-4" />{t("pay", lang)} · {money(summary.priceCents)}</>}</button>
      <p className="text-center text-[11px] text-[var(--color-bone-muted)]">{t("fee", lang)}</p>
      {message ? <p role="status" className="text-xs leading-5 text-amber-100">{message}</p> : null}
      <Link href={manageUrl} className="block text-center text-[11px] text-[var(--color-brass)] underline underline-offset-2">{t("view", lang)}</Link>
    </div>
  );
}
