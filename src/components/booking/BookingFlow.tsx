"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type HTMLAttributes, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Loader2, MapPin, Phone, Scissors, UserRound } from "lucide-react";
import { businessConfig } from "@/lib/config/business";
import type { AvailabilitySlot, BookingCatalog, BookingConfirmation } from "@/lib/booking/types";

const steps = ["Service", "Barber", "Date & time", "Your details", "Review"] as const;
const storageKey = "lbl-booking-draft-v3";

type Draft = {
  serviceId: string;
  addonIds: string[];
  barberId: string | null;
  firstAvailable: boolean;
  date: string;
  startsAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredLanguage: "en" | "es";
  existingClient: "yes" | "no" | "unsure";
  notes: string;
  emailConsent: boolean;
  smsConsent: boolean;
  policyAccepted: boolean;
  idempotencyKey: string;
};

function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: businessConfig.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function newDraft(): Draft {
  return { serviceId: "", addonIds: [], barberId: null, firstAvailable: true, date: localToday(), startsAt: "", firstName: "", lastName: "", email: "", phone: "", preferredLanguage: "en", existingClient: "unsure", notes: "", emailConsent: true, smsConsent: false, policyAccepted: false, idempotencyKey: globalThis.crypto.randomUUID() };
}

export function BookingFlow() {
  const searchParams = useSearchParams();
  const [catalog, setCatalog] = useState<BookingCatalog | null>(null);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [step, setStep] = useState(0);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const initialized = useRef(false);
  const analyticsSession = useRef("");

  const track = useCallback((eventName: string, metadata: Record<string, string | number | boolean | null> = {}, appointmentId?: string) => {
    if (typeof window === "undefined" || navigator.doNotTrack === "1" || localStorage.getItem("analytics-consent") === "denied") return;
    if (!analyticsSession.current) analyticsSession.current = sessionStorage.getItem("lbl-booking-session") || globalThis.crypto.randomUUID();
    sessionStorage.setItem("lbl-booking-session", analyticsSession.current);
    void fetch("/api/booking/events", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventName, anonymousSessionId: analyticsSession.current, appointmentId, step, source: searchParams.get("utm_source") === "business_card" ? "qr_business_card" : "website", campaignSource: searchParams.get("utm_source"), campaignMedium: searchParams.get("utm_medium"), campaignName: searchParams.get("utm_campaign"), metadata }) }).catch(() => undefined);
  }, [searchParams, step]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let restoreTimer: number | null = null;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const restored = { ...newDraft(), ...JSON.parse(saved) as Partial<Draft>, startsAt: "" };
        restoreTimer = window.setTimeout(() => setDraft(restored), 0);
      }
    } catch { /* damaged draft is safely ignored */ }
    track(searchParams.get("utm_medium") === "qr" ? "qr_booking_page_viewed" : "booking_page_viewed");
    const loadCatalog = async () => {
      let lastMessage = "Booking is temporarily unavailable.";
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await fetch(`/api/booking/catalog?attempt=${attempt}`, { cache: "no-store" });
        const payload = await response.json() as { ok: boolean; catalog?: BookingCatalog; message?: string; setupRequired?: boolean };
        if (response.ok && payload.catalog?.services.length && payload.catalog.barbers.length) return payload.catalog;
        lastMessage = payload.message || lastMessage;
        if (!payload.setupRequired || attempt === 2) break;
        await new Promise((resolve) => window.setTimeout(resolve, 900 * (attempt + 1)));
      }
      throw new Error(lastMessage);
    };
    loadCatalog().then((loadedCatalog) => {
      setCatalog(loadedCatalog);
      const serviceSlug = searchParams.get("service");
      const barberSlug = searchParams.get("barber");
      const requestedBarber = loadedCatalog.barbers.find((item) => item.slug === barberSlug);
      const useFirstAvailable = !barberSlug || barberSlug === "best-available" || !requestedBarber;
      setDraft((current) => ({
        ...current,
        serviceId: loadedCatalog.services.find((item) => item.slug === serviceSlug)?.id || current.serviceId,
        barberId: useFirstAvailable ? null : requestedBarber.id,
        firstAvailable: useFirstAvailable,
      }));
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Booking is temporarily unavailable.")).finally(() => setLoadingCatalog(false));
    return () => { if (restoreTimer !== null) window.clearTimeout(restoreTimer); };
  }, [searchParams, track]);

  useEffect(() => { if (initialized.current) sessionStorage.setItem(storageKey, JSON.stringify(draft)); }, [draft]);
  useEffect(() => { const pop = (event: PopStateEvent) => setStep(Math.max(0, Math.min(4, typeof event.state?.bookingStep === "number" ? event.state.bookingStep : 0))); window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);

  const service = catalog?.services.find((item) => item.id === draft.serviceId);
  const addons = catalog?.addons.filter((item) => draft.addonIds.includes(item.id)) ?? [];
  const selectedSlot = slots.find((item) => item.startsAt === draft.startsAt);
  const selectedBarber = catalog?.barbers.find((item) => item.id === (selectedSlot?.barberId ?? draft.barberId));
  const eligibleBarbers = catalog?.barbers.filter((barber) => barber.serviceIds.includes(draft.serviceId)) ?? [];
  const estimatedPrice = (service?.priceCents ?? 0) + addons.reduce((sum, item) => sum + item.priceCents, 0);
  const duration = (service?.durationMinutes ?? 0) + addons.reduce((sum, item) => sum + item.durationMinutes, 0);

  useEffect(() => {
    if (!catalog || !service || step !== 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoadingSlots(true); setError(""); setSlots([]); setDraft((current) => ({ ...current, startsAt: "" }));
      fetch("/api/booking/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: catalog.location.id, serviceId: service.id, addonIds: draft.addonIds, barberIds: draft.firstAvailable || !draft.barberId ? undefined : [draft.barberId], startDate: draft.date, days: 1 }), signal: controller.signal }).then(async (response) => {
        const payload = await response.json() as { ok: boolean; slots?: AvailabilitySlot[]; message?: string };
        if (!response.ok) throw new Error(payload.message || "Availability could not be loaded.");
        setSlots(payload.slots ?? []); setAnnouncement(`${payload.slots?.length ?? 0} appointment times available.`);
      }).catch((caught) => { if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "Availability could not be loaded."); }).finally(() => setLoadingSlots(false));
    }, 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [catalog, service, draft.addonIds, draft.barberId, draft.firstAvailable, draft.date, step]);

  const canContinue = (() => {
    if (step === 0) return Boolean(service);
    if (step === 1) {
      if (draft.firstAvailable) return eligibleBarbers.some((barber) => barber.bookable);
      return Boolean(eligibleBarbers.find((barber) => barber.id === draft.barberId)?.bookable);
    }
    if (step === 2) return Boolean(selectedSlot);
    if (step === 3) return Boolean(draft.firstName.trim() && draft.lastName.trim() && /@/.test(draft.email) && draft.phone.replace(/\D/g, "").length >= 10 && draft.policyAccepted);
    return true;
  })();

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: [] })); setError("");
    if (key === "serviceId" && value) track("service_selected");
    if (key === "barberId" && value) track("barber_selected");
    if (key === "firstAvailable" && value === true) track("first_available_selected");
    if (key === "date" && value) track("date_selected");
    if (key === "startsAt" && value) track("time_selected");
  }

  function go(next: number) {
    if (next > step) track("booking_step_completed", { completedStep: step + 1 });
    if (step === 0 && next === 1) track("booking_started");
    setStep(next); window.history.pushState({ bookingStep: next }, "", `${window.location.pathname}${window.location.search}#step-${next + 1}`); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!catalog || !service || !selectedSlot || !selectedBarber || submitting) return;
    setSubmitting(true); setError(""); setFieldErrors({}); track("booking_submitted");
    try {
      const response = await fetch("/api/booking/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId: service.id, serviceSlug: service.slug, addonIds: draft.addonIds, barberId: selectedBarber.id, barberSlug: selectedBarber.slug, firstAvailable: draft.firstAvailable, locationId: catalog.location.id, startsAt: selectedSlot.startsAt, firstName: draft.firstName, lastName: draft.lastName, email: draft.email, phone: draft.phone, preferredLanguage: draft.preferredLanguage, existingClient: draft.existingClient, notes: draft.notes, emailConsent: draft.emailConsent, smsConsent: draft.smsConsent, policyAccepted: draft.policyAccepted, policyVersion: businessConfig.bookingPolicyVersion, idempotencyKey: draft.idempotencyKey, source: searchParams.get("utm_source") === "business_card" ? "qr_business_card" : "website", campaignSource: searchParams.get("utm_source"), campaignMedium: searchParams.get("utm_medium"), campaignName: searchParams.get("utm_campaign"), referralSource: searchParams.get("ref"), pageUrl: window.location.href, company: "" }) });
      const result = await response.json() as { ok: boolean; confirmation?: BookingConfirmation; message?: string; fields?: Record<string, string[]>; alternatives?: AvailabilitySlot[] };
      if (!response.ok || !result.confirmation) {
        if (result.fields) setFieldErrors(result.fields);
        if (result.alternatives?.length) { setSlots(result.alternatives); track("availability_conflict"); }
        throw new Error(result.message || "The appointment could not be reserved.");
      }
      if (referenceImage) { const upload = new FormData(); upload.set("reference", result.confirmation.reference); upload.set("token", result.confirmation.manageToken); upload.set("file", referenceImage); await fetch("/api/booking/reference-image", { method: "POST", body: upload }).catch(() => undefined); }
      track("booking_confirmed", {}, result.confirmation.id); sessionStorage.removeItem(storageKey);
      window.location.assign(`/booking/confirmation/${encodeURIComponent(result.confirmation.reference)}?token=${encodeURIComponent(result.confirmation.manageToken)}`);
    } catch (caught) { track("booking_failed"); setError(caught instanceof Error ? caught.message : "The appointment could not be reserved."); }
    finally { setSubmitting(false); }
  }

  if (loadingCatalog) return <BookingSkeleton />;
  if (!catalog) return <BookingUnavailable message={error} />;

  return <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
    <section className="min-w-0 border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/75 p-5 sm:p-8">
      <ol className="grid grid-cols-5 gap-2" aria-label="Booking progress">{steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined}><div className={index <= step ? "h-px bg-[var(--color-brass)]" : "h-px bg-[var(--color-ink-line)]"} /><span className={index === step ? "mt-2 block text-[9px] tracking-[.12em] uppercase text-[var(--color-brass)]" : "mt-2 hidden text-[9px] tracking-[.12em] uppercase text-[var(--color-bone-muted)] sm:block"}>{index + 1}. {label}</span></li>)}</ol>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div className="mt-8">{step === 0 ? <ServiceStep catalog={catalog} draft={draft} update={update} /> : null}{step === 1 ? <BarberStep barbers={eligibleBarbers} draft={draft} update={update} /> : null}{step === 2 ? <TimeStep draft={draft} update={update} slots={slots} loading={loadingSlots} timezone={catalog.location.timezone} /> : null}{step === 3 ? <DetailsStep draft={draft} update={update} fieldErrors={fieldErrors} image={referenceImage} setImage={setReferenceImage} /> : null}{step === 4 ? <ReviewStep draft={draft} service={service} addons={addons} barber={selectedBarber} slot={selectedSlot} location={catalog.location} duration={duration} estimatedPrice={estimatedPrice} /> : null}</div>
      {error ? <p role="alert" className="mt-6 rounded-lg border border-red-800/50 bg-red-950/25 p-4 text-sm text-red-100">{error}</p> : null}
      <div className="mt-8 flex items-center justify-between border-t border-[var(--color-ink-line)] pt-6"><button type="button" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0 || submitting} className="inline-flex min-h-11 items-center gap-2 text-[10px] tracking-[.18em] uppercase text-[var(--color-bone-muted)] disabled:opacity-30"><ArrowLeft className="h-4 w-4" />Back</button>{step < 4 ? <button type="button" onClick={() => canContinue && go(step + 1)} disabled={!canContinue} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 text-[10px] tracking-[.18em] uppercase text-black disabled:opacity-35">Continue<ArrowRight className="h-4 w-4" /></button> : <button type="submit" disabled={!canContinue || submitting} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 text-[10px] tracking-[.18em] uppercase text-black disabled:opacity-35">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Confirm appointment</button>}</div>
    </section>
    <BookingSummary service={service} barber={selectedBarber} slot={selectedSlot} location={catalog.location} duration={duration} estimatedPrice={estimatedPrice} />
  </form>;
}

function StepTitle({ number, title, copy }: { number: string; title: string; copy: string }) { return <header><p className="text-[10px] tracking-[.28em] uppercase text-[var(--color-brass)]">Step {number}</p><h2 className="font-display mt-3 text-3xl sm:text-5xl">{title}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-bone-muted)]">{copy}</p></header>; }
function ServiceStep({ catalog, draft, update }: { catalog: BookingCatalog; draft: Draft; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
  return <div>
    <StepTitle number="1" title="Choose your service" copy="Review the exact duration, price, and required full payment before choosing a chair." />
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      {catalog.services.map((item) => <label key={item.id} className={draft.serviceId === item.id ? "cursor-pointer rounded-xl border border-[var(--color-brass)] bg-[var(--color-brass)]/5 p-4" : "cursor-pointer rounded-xl border border-[var(--color-ink-line)] p-4 hover:border-[var(--color-brass)]/50"}>
        <input type="radio" name="service" value={item.id} checked={draft.serviceId === item.id} onChange={() => update("serviceId", item.id)} className="sr-only" />
        <span className="font-display text-xl">{item.name}</span>
        <span className="mt-2 block text-xs leading-5 text-[var(--color-bone-muted)]">{item.description}</span>
        <span className="mt-4 grid grid-cols-3 gap-2 text-[9px] tracking-[.12em] uppercase">
          <span>{item.durationMinutes} min</span>
          <span className="text-center text-[var(--color-brass)]">${(item.priceCents / 100).toFixed(0)}</span>
          <span className="text-right">Pay ${(item.depositCents / 100).toFixed(0)}</span>
        </span>
      </label>)}
    </div>
    <fieldset className="mt-8">
      <legend className="text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Optional enhancements</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{catalog.addons.map((item) => <label key={item.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-ink-line)] px-4"><input type="checkbox" checked={draft.addonIds.includes(item.id)} onChange={(event) => update("addonIds", event.target.checked ? [...draft.addonIds, item.id] : draft.addonIds.filter((id) => id !== item.id))} className="h-5 w-5 accent-[var(--color-brass)]" /><span className="flex-1 text-sm">{item.name}</span><span className="text-xs text-[var(--color-brass)]">+${(item.priceCents / 100).toFixed(0)}</span></label>)}</div>
    </fieldset>
  </div>;
}
function BarberStep({ barbers, draft, update }: { barbers: BookingCatalog["barbers"]; draft: Draft; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
  const firstAvailableReady = barbers.some((barber) => barber.bookable);
  return <div>
    <StepTitle number="2" title="Choose your barber" copy="Select a specific professional or let the system find the first eligible opening." />
    <label className={draft.firstAvailable ? "mt-7 flex cursor-pointer items-center gap-4 rounded-xl border border-[var(--color-brass)] bg-[var(--color-brass)]/5 p-5" : "mt-7 flex cursor-pointer items-center gap-4 rounded-xl border border-[var(--color-ink-line)] p-5"}>
      <input type="radio" name="barber" checked={draft.firstAvailable} disabled={!firstAvailableReady} onChange={() => { update("firstAvailable", true); update("barberId", null); }} className="h-5 w-5 accent-[var(--color-brass)]" />
      <div><span className="font-display text-2xl">First available</span><span className="mt-1 block text-sm text-[var(--color-bone-muted)]">{firstAvailableReady ? "The earliest eligible barber for your selected service." : "No confirmed schedules are posted for this service yet."}</span></div>
    </label>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {barbers.map((barber) => {
        const selected = !draft.firstAvailable && draft.barberId === barber.id;
        const cardClass = barber.bookable
          ? (selected ? "overflow-hidden rounded-xl border border-[var(--color-brass)] bg-[var(--color-brass)]/5" : "overflow-hidden rounded-xl border border-[var(--color-ink-line)] hover:border-[var(--color-brass)]/50")
          : "overflow-hidden rounded-xl border border-[var(--color-ink-line)] opacity-65";
        return <article key={barber.id} className={cardClass}>
          <label aria-disabled={!barber.bookable} className={barber.bookable ? "block cursor-pointer" : "block"}>
            <input type="radio" name="barber" checked={selected} disabled={!barber.bookable} onChange={() => { update("firstAvailable", false); update("barberId", barber.id); }} className="sr-only" />
            {barber.portrait ? <div className="relative aspect-[4/5] overflow-hidden bg-black"><picture>{barber.portraitAvif ? <source srcSet={barber.portraitAvif} type="image/avif" /> : null}<source srcSet={barber.portrait} type="image/webp" /><Image src={barber.portraitJpeg ?? barber.portrait} alt={barber.name} fill sizes="(max-width: 640px) 100vw, 50vw" style={{ objectPosition: barber.portraitPosition }} className="object-cover" /></picture></div> : null}
            <div className="grid min-h-[15.5rem] grid-rows-[auto_auto_4rem_auto_auto_auto] p-4 pb-2">
              <span className="font-display text-2xl">{barber.name}</span>
              <span className="mt-1 block text-xs text-[var(--color-brass)]">{barber.title}</span>
              <span className="mt-3 block line-clamp-3 min-h-[4rem] text-xs leading-5 text-[var(--color-bone-muted)]">{barber.biography}</span>
              <span className="mt-3 block line-clamp-2 min-h-[2.5rem] text-[9px] leading-5 tracking-[.12em] uppercase text-[var(--color-bone-muted)]">{barber.specialties.join(" · ")}</span>
              <span className="mt-2 block text-[9px] tracking-[.12em] uppercase text-[var(--color-bone-muted)]">{barber.languages.length ? barber.languages.join(" · ") : "Languages confirmed at booking"}</span>
              <span className={barber.bookable ? "mt-3 block text-[9px] tracking-[.12em] uppercase text-emerald-200" : "mt-3 block text-[9px] leading-5 tracking-[.12em] uppercase text-[var(--color-brass)]"}>{barber.bookable ? "Schedule available" : barber.availabilityNote}</span>
            </div>
          </label>
          <div className="px-4 pb-4"><Link href={`/barbers/${barber.slug}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-[9px] tracking-[.16em] uppercase text-[var(--color-brass)]">View profile</Link></div>
        </article>;
      })}
    </div>
  </div>;
}
function TimeStep({ draft, update, slots, loading, timezone }: { draft: Draft; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void; slots: AvailabilitySlot[]; loading: boolean; timezone: string }) { return <div><StepTitle number="3" title="Choose a real available time" copy={`Availability is shown in ${timezone.replaceAll("_", " ")} and rechecked when you confirm.`} /><label className="mt-7 block max-w-xs text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Date<input type="date" value={draft.date} min={localToday()} onChange={(event) => update("date", event.target.value)} className="form-control mt-2 min-h-14 w-full text-base normal-case tracking-normal" /></label>{loading ? <div className="mt-7 grid gap-3 sm:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div> : slots.length ? <fieldset className="mt-7"><legend className="text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Available times</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{slots.map((slot) => <label key={slot.id} className={draft.startsAt === slot.startsAt ? "cursor-pointer rounded-xl border border-[var(--color-brass)] bg-[var(--color-brass)]/5 p-4 text-center" : "cursor-pointer rounded-xl border border-[var(--color-ink-line)] p-4 text-center hover:border-[var(--color-brass)]/50"}><input type="radio" name="time" checked={draft.startsAt === slot.startsAt} onChange={() => update("startsAt", slot.startsAt)} className="sr-only" /><span className="block text-base">{new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(slot.startsAt))}</span><span className="mt-1 block text-[9px] tracking-[.12em] uppercase text-[var(--color-bone-muted)]">{slot.barberName}</span></label>)}</div></fieldset> : <div className="mt-7 rounded-xl border border-dashed border-[var(--color-ink-line)] p-7 text-center"><CalendarDays className="mx-auto h-6 w-6 text-[var(--color-brass)]" /><p className="font-display mt-3 text-2xl">No openings on this date</p><p className="mt-2 text-sm text-[var(--color-bone-muted)]">Choose another day or call the lounge for assistance.</p></div>}</div>; }
function DetailsStep({ draft, update, fieldErrors, image, setImage }: { draft: Draft; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void; fieldErrors: Record<string, string[]>; image: File | null; setImage: (file: File | null) => void }) {
  return <div>
    <StepTitle number="4" title="Tell us who is coming" copy="We use these details only to manage your appointment and requested communication preferences." />
    <div className="mt-7 grid gap-5 sm:grid-cols-2">
      <Field label="First name" value={draft.firstName} onChange={(value) => update("firstName", value)} error={fieldErrors.firstName?.[0]} autoComplete="given-name" />
      <Field label="Last name" value={draft.lastName} onChange={(value) => update("lastName", value)} error={fieldErrors.lastName?.[0]} autoComplete="family-name" />
      <Field label="Email" type="email" value={draft.email} onChange={(value) => update("email", value)} error={fieldErrors.email?.[0]} autoComplete="email" inputMode="email" />
      <Field label="Phone" type="tel" value={draft.phone} onChange={(value) => update("phone", value)} error={fieldErrors.phone?.[0]} autoComplete="tel" inputMode="tel" />
    </div>
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <fieldset>
        <legend className="text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Preferred language</legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {(["en", "es"] as const).map((value) => <label key={value} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4"><input type="radio" name="preferred-language" checked={draft.preferredLanguage === value} onChange={() => update("preferredLanguage", value)} className="accent-[var(--color-brass)]" /><span className="text-sm">{value === "en" ? "English" : "Español"}</span></label>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Have you visited us before?</legend>
        <div className="mt-3 flex flex-wrap gap-3">{(["yes", "no", "unsure"] as const).map((value) => <label key={value} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4"><input type="radio" name="existing-client" checked={draft.existingClient === value} onChange={() => update("existingClient", value)} className="accent-[var(--color-brass)]" /><span className="text-sm capitalize">{value}</span></label>)}</div>
      </fieldset>
    </div>
    <label className="mt-6 block text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Optional notes<textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} maxLength={1000} rows={4} className="form-control mt-2 w-full resize-y text-base normal-case tracking-normal" placeholder="Hair goals, accessibility needs, or anything the barber should know." /></label>
    <label className="mt-6 block rounded-xl border border-dashed border-[var(--color-ink-line)] p-4"><span className="text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Optional inspiration image</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file=event.target.files?.[0]??null; if(file&&file.size>10*1024*1024){event.target.value="";setImage(null);setErrorForFile(event.currentTarget, "Image must be 10 MB or smaller.");}else setImage(file); }} className="mt-3 block w-full text-sm text-[var(--color-bone-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-brass)] file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-wider file:text-black" />{image ? <small className="mt-2 block text-[var(--color-bone-muted)]">{image.name}</small> : null}</label>
    <div className="mt-6 space-y-3"><Consent checked={draft.emailConsent} onChange={(value) => update("emailConsent", value)}>Email me appointment confirmations and updates.</Consent><Consent checked={draft.smsConsent} onChange={(value) => update("smsConsent", value)}>Text me appointment and queue updates. Message and data rates may apply.</Consent><Consent checked={draft.policyAccepted} onChange={(value) => update("policyAccepted", value)} required>I acknowledge the booking, cancellation, and no-show policy.</Consent></div>
  </div>;
}

function setErrorForFile(input: HTMLInputElement, message: string) {
  input.setCustomValidity(message);
  input.reportValidity();
  window.setTimeout(() => input.setCustomValidity(""), 2500);
}

function ReviewStep({ draft, service, addons, barber, slot, location, duration, estimatedPrice }: { draft: Draft; service: BookingCatalog["services"][number] | undefined; addons: BookingCatalog["addons"]; barber: BookingCatalog["barbers"][number] | undefined; slot: AvailabilitySlot | undefined; location: BookingCatalog["location"]; duration: number; estimatedPrice: number }) {
  return <div>
    <StepTitle number="5" title="Review your appointment" copy="The selected time is revalidated and reserved atomically when you confirm. A success message appears only after the booking is saved." />
    <dl className="mt-7 grid gap-4 sm:grid-cols-2">
      <Review label="Service" value={service?.name ?? "—"} />
      <Review label="Add-ons" value={addons.length ? addons.map((item) => item.name).join(", ") : "None"} />
      <Review label="Barber" value={barber?.name ?? "—"} />
      <Review label="Date and time" value={slot ? new Intl.DateTimeFormat("en-US", { timeZone: location.timezone, dateStyle: "full", timeStyle: "short" }).format(new Date(slot.startsAt)) : "—"} />
      <Review label="Duration" value={`${duration} minutes`} />
      <Review label="Price" value={`$${(estimatedPrice / 100).toFixed(2)}`} />
      <Review label="Due now to confirm" value={`$${(estimatedPrice / 100).toFixed(2)} + 4% service fee`} />
      <Review label="Client" value={`${draft.firstName} ${draft.lastName}`} />
      <Review label="Contact" value={`${draft.email} · ${draft.phone}`} />
      <Review label="Preferred language" value={draft.preferredLanguage === "es" ? "Español" : "English"} />
      <Review label="Location" value={location.address} />
      <Review label="Policy" value="Acknowledged" />
    </dl>
  </div>;
}
function BookingSummary({ service, barber, slot, location, duration, estimatedPrice }: { service: BookingCatalog["services"][number] | undefined; barber: BookingCatalog["barbers"][number] | undefined; slot: AvailabilitySlot | undefined; location: BookingCatalog["location"]; duration: number; estimatedPrice: number }) { return <aside className="h-fit border border-[var(--color-brass)]/25 bg-black/25 p-6 lg:sticky lg:top-24"><p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Your appointment</p><dl className="mt-6 space-y-5"><Summary icon={<Scissors className="h-4 w-4" />} label="Service" value={service?.name ?? "Choose a service"} /><Summary icon={<UserRound className="h-4 w-4" />} label="Barber" value={barber?.name ?? "Choose a barber"} /><Summary icon={<CalendarDays className="h-4 w-4" />} label="Time" value={slot ? new Intl.DateTimeFormat("en-US", { timeZone: location.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(slot.startsAt)) : "Choose a time"} /><Summary icon={<Clock3 className="h-4 w-4" />} label="Duration" value={duration ? `${duration} minutes` : "—"} /><Summary icon={<MapPin className="h-4 w-4" />} label="Location" value={location.address} /></dl><div className="mt-7 border-t border-[var(--color-ink-line)] pt-5"><p className="text-[9px] tracking-[.2em] uppercase text-[var(--color-bone-muted)]">Estimated total</p><p className="font-display mt-2 text-3xl text-[var(--color-brass)]">{estimatedPrice ? `$${(estimatedPrice / 100).toFixed(2)}` : "—"}</p></div><a href={businessConfig.phoneHref} onClick={() => trackClick("call_action")} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--color-ink-line)] text-[10px] tracking-[.18em] uppercase"><Phone className="h-4 w-4" />Need help? Call</a></aside>; }
function trackClick(eventName: string) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1" || localStorage.getItem("analytics-consent") === "denied") return;
  const anonymousSessionId = sessionStorage.getItem("lbl-booking-session") || globalThis.crypto.randomUUID();
  sessionStorage.setItem("lbl-booking-session", anonymousSessionId);
  void fetch("/api/booking/events", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventName, anonymousSessionId, metadata: {} }) }).catch(() => undefined);
}
function Field({ label, value, onChange, error, type = "text", autoComplete, inputMode }: { label: string; value: string; onChange: (value: string) => void; error?: string; type?: string; autoComplete?: string; inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"] }) { return <label className="block text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} inputMode={inputMode} aria-invalid={Boolean(error)} className="form-control mt-2 min-h-14 w-full text-base normal-case tracking-normal" />{error ? <span className="mt-2 block text-xs normal-case tracking-normal text-red-200">{error}</span> : null}</label>; }
function Consent({ checked, onChange, children, required = false }: { checked: boolean; onChange: (value: boolean) => void; children: ReactNode; required?: boolean }) { return <label className="flex cursor-pointer gap-3 text-sm leading-6 text-[var(--color-bone-muted)]"><input type="checkbox" checked={checked} required={required} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-brass)]" /><span>{children}{required ? <span className="text-[var(--color-brass)]"> *</span> : null}</span></label>; }
function Review({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--color-ink-line)] p-4"><dt className="text-[9px] tracking-[.2em] uppercase text-[var(--color-brass)]">{label}</dt><dd className="mt-2 text-sm leading-6 text-[var(--color-bone)]">{value}</dd></div>; }
function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="flex gap-3"><span className="mt-1 text-[var(--color-brass)]">{icon}</span><div><dt className="text-[9px] tracking-[.18em] uppercase text-[var(--color-bone-muted)]">{label}</dt><dd className="mt-1 text-sm leading-6">{value}</dd></div></div>; }
function BookingSkeleton() { return <div className="grid gap-6 lg:grid-cols-[1fr_330px]"><div className="h-[620px] animate-pulse border border-[var(--color-ink-line)] bg-white/5" /><div className="h-80 animate-pulse border border-[var(--color-ink-line)] bg-white/5" /></div>; }
function BookingUnavailable({ message }: { message: string }) { return <div className="border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)] p-8 text-center"><h2 className="font-display text-3xl">Online booking is temporarily unavailable</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--color-bone-muted)]">{message || "Please call the lounge and we will reserve your chair directly."}</p><a href={businessConfig.phoneHref} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 text-[10px] tracking-[.2em] uppercase text-black"><Phone className="h-4 w-4" />Call {businessConfig.phone}</a></div>; }