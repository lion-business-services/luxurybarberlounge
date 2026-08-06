"use client";

import { useState } from "react";
import { Check, Clock3, Loader2, ShieldCheck, Smartphone, UsersRound } from "lucide-react";
import { barbers, business, services } from "@/lib/content/site";
import { features } from "@/lib/config/features";

export function WalkInFlow({ kiosk = false }: { kiosk?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ token: string; wait: number | null; live: boolean } | null>(null);
  const [error, setError] = useState("");

  if (!features.walkInQueue) {
    return (
      <section className={kiosk ? "mx-auto max-w-2xl text-center" : "border border-[var(--color-brass)]/25 bg-[var(--color-ink-soft)]/70 p-7 sm:p-9"}>
        <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Walk-in service</p>
        <h2 className="font-display mt-4 text-3xl sm:text-4xl">Digital queue activation is in progress.</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">Walk-ins are welcome when capacity allows. Call the lounge before traveling for the most current chair availability, or reserve an appointment for a guaranteed time.</p>
        <div className={kiosk ? "mt-7 flex flex-wrap justify-center gap-3" : "mt-7 flex flex-wrap gap-3"}>
          <a href={business.phoneHref} className="inline-flex rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.2em] uppercase text-[var(--color-ink)]">Call {business.phone}</a>
          <a href="/book" className="inline-flex rounded-full border border-[var(--color-ink-line)] px-6 py-3 text-[10px] tracking-[.2em] uppercase text-[var(--color-bone)]">Reserve a chair</a>
        </div>
      </section>
    );
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const payload = await response.json() as { token?: string; estimatedWait?: number | null; message?: string; live?: boolean };
      if (!response.ok || !payload.token) throw new Error(payload.message ?? "Unable to prepare queue entry.");
      setResult({ token: payload.token, wait: payload.estimatedWait ?? null, live: payload.live === true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to prepare queue entry."); }
    finally { setBusy(false); }
  }
  if (result) return <section className={kiosk?"mx-auto max-w-xl text-center":"border border-emerald-700/35 bg-emerald-950/15 p-8 text-center"}><span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-500/40 text-emerald-300"><Check className="h-7 w-7"/></span><p className="mt-6 text-[10px] tracking-[.3em] uppercase text-emerald-300">{result.live ? "Private queue token" : "Preview reference"}</p><h2 className="font-display mt-3 text-6xl">{result.token}</h2><p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">{result.live && result.wait !== null ? `Estimated wait: approximately ${result.wait} minutes. Reception may update the estimate as appointments and service durations change.` : `This preview did not add you to a live queue. Please call ${business.phone} or speak with reception.`}</p>{result.live ? <a href={`/kiosk/status/${result.token}`} className="mt-6 inline-flex rounded-full border border-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Open status view</a> : <a href={business.phoneHref} className="mt-6 inline-flex rounded-full border border-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.2em] uppercase text-[var(--color-brass)]">Call the lounge</a>}</section>;
  return <form onSubmit={submit} className={kiosk?"mx-auto max-w-3xl":"border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/70 p-6 sm:p-8"}>
    <div className="grid gap-5 sm:grid-cols-2"><label><span className="form-label">Full name</span><input name="name" className="form-control" required autoComplete="name"/></label><label><span className="form-label">Mobile phone</span><input name="phone" className="form-control" required type="tel" autoComplete="tel"/></label><label><span className="form-label">Service</span><select name="service" className="form-control" required defaultValue=""><option value="" disabled>Select service</option>{services.slice(0,16).map((service)=><option key={service.slug} value={service.slug}>{service.name.en} · {service.minutes} min</option>)}</select></label><label><span className="form-label">Barber preference</span><select name="barber" className="form-control" defaultValue="first-available"><option value="first-available">First available</option>{barbers.filter((barber) => barber.active && barber.walkIns).map((barber)=><option key={barber.slug} value={barber.slug}>{barber.name}</option>)}</select></label></div>
    <fieldset className="mt-6"><legend className="form-label">Have you visited the lounge before?</legend><div className="grid gap-3 sm:grid-cols-2"><label className="choice-card cursor-pointer"><span><strong>First visit</strong><small>New lounge client</small></span><input type="radio" name="returning" value="no" required/></label><label className="choice-card cursor-pointer"><span><strong>Returning</strong><small>Existing lounge client</small></span><input type="radio" name="returning" value="yes" required/></label></div></fieldset>
    <div className="mt-6 grid gap-3">
      <label className="flex items-start gap-3 text-xs leading-6 text-[var(--color-bone-muted)]"><input name="smsConsent" value="yes" type="checkbox" className="mt-1 accent-[var(--color-brass)]"/><span>I agree to transactional text messages about queue status. Message and data rates may apply.</span></label>
      <label className="flex items-start gap-3 text-xs leading-6 text-[var(--color-bone-muted)]"><input name="publicDisplayConsent" value="yes" type="checkbox" className="mt-1 accent-[var(--color-brass)]"/><span>Show my first name and last initial on the in-shop queue screen. Leave unchecked to appear only as a private guest token.</span></label>
    </div>
    {error?<p role="alert" className="mt-5 border border-red-800/40 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>:null}
    <button type="submit" disabled={busy} className="mt-7 inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-7 py-3.5 text-[11px] tracking-[.2em] uppercase text-[var(--color-ink)] disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<UsersRound className="h-4 w-4"/>} Join queue</button>
    <div className="mt-7 grid gap-3 border-t border-[var(--color-ink-line)] pt-5 text-xs leading-6 text-[var(--color-bone-muted)] sm:grid-cols-3"><p className="flex gap-2"><Clock3 className="mt-1 h-4 w-4 shrink-0 text-[var(--color-brass)]"/>Wait times are estimates.</p><p className="flex gap-2"><Smartphone className="mt-1 h-4 w-4 shrink-0 text-[var(--color-brass)]"/>Status updates follow your selected contact preference.</p><p className="flex gap-2"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[var(--color-brass)]"/>The public screen never shows phone numbers, email addresses, or full client records.</p></div>
  </form>;
}
