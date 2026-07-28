"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { barbers, business, serviceAddOns, services } from "@/lib/content/site";
import { features } from "@/lib/config/features";

const steps = ["Service", "Barber", "Your visit", "Contact", "Complete"] as const;

type FormState = {
  serviceSlug: string;
  barberSlug: string;
  addOns: string[];
  firstVisit: "yes" | "no" | "";
  preExistingBarberClient: "yes" | "no" | "";
  source: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  smsConsent: boolean;
  policyConsent: boolean;
};

export function BookingFlow() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [delivered, setDelivered] = useState(false);
  const [form, setForm] = useState<FormState>({
    serviceSlug: searchParams.get("service") ?? "",
    barberSlug: searchParams.get("barber") ?? "best-available",
    addOns: [],
    firstVisit: "",
    preExistingBarberClient: "",
    source: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
    smsConsent: false,
    policyConsent: false,
  });

  const selectedService = services.find((item) => item.slug === form.serviceSlug);
  const selectedBarber = barbers.find((item) => item.slug === form.barberSlug);
  const selectedAddOns = serviceAddOns.filter((item) => form.addOns.includes(item.slug));
  const totalFrom = (selectedService?.from ?? 0) + selectedAddOns.reduce((sum, item) => sum + item.price, 0);
  const totalMinutes = (selectedService?.minutes ?? 0) + selectedAddOns.reduce((sum, item) => sum + item.minutes, 0);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(form.serviceSlug);
    if (step === 1) return Boolean(form.barberSlug);
    if (step === 2) return Boolean(form.firstVisit && form.source);
    if (step === 3) return Boolean(form.name.trim() && form.email.trim() && form.phone.trim() && form.policyConsent);
    return true;
  }, [form, step]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function toggleAddOn(slug: string) {
    setForm((current) => ({
      ...current,
      addOns: current.addOns.includes(slug)
        ? current.addOns.filter((item) => item !== slug)
        : [...current.addOns, slug],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canContinue) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: features.squareLiveBooking ? "booking_handoff" : "booking_request",
          ...form,
          estimatedFromCents: totalFrom * 100,
          estimatedMinutes: totalMinutes,
          pageUrl: window.location.href,
          company: "",
        }),
      });
      const payload = (await response.json()) as { reference?: string; message?: string; accepted?: boolean };
      if (!response.ok) throw new Error(payload.message ?? "Unable to submit your request.");
      setReference(payload.reference ?? "LBL-REQUEST");
      setDelivered(payload.accepted !== false);
      setStep(4);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit your request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <form onSubmit={submit} className="border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/75 p-6 sm:p-9">
        <ol className="mb-9 grid grid-cols-5 gap-2" aria-label="Booking progress">
          {steps.map((label, index) => (
            <li key={label} className="min-w-0">
              <div className={index <= step ? "h-px bg-[var(--color-brass)]" : "h-px bg-[var(--color-ink-line)]"} />
              <span className={index === step ? "mt-2 block truncate text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]" : "mt-2 block truncate text-[9px] tracking-[.18em] uppercase text-[var(--color-bone-muted)]"}>
                {index + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        {step === 0 ? <ServiceStep value={form.serviceSlug} onChange={(value) => update("serviceSlug", value)} addOns={form.addOns} toggleAddOn={toggleAddOn} /> : null}
        {step === 1 ? <BarberStep value={form.barberSlug} onChange={(value) => update("barberSlug", value)} serviceSlug={form.serviceSlug} /> : null}
        {step === 2 ? <VisitStep form={form} update={update} /> : null}
        {step === 3 ? <ContactStep form={form} update={update} live={features.squareLiveBooking} /> : null}
        {step === 4 ? <Completion reference={reference} live={features.squareLiveBooking} delivered={delivered} /> : null}

        {error ? <p role="alert" className="mt-6 border border-red-800/50 bg-red-950/25 p-4 text-sm text-red-200">{error}</p> : null}

        {step < 4 ? (
          <div className="mt-9 flex items-center justify-between border-t border-[var(--color-ink-line)] pt-6">
            <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || busy} className="inline-flex items-center gap-2 text-[10px] tracking-[.24em] uppercase text-[var(--color-bone-muted)] disabled:opacity-30">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < 3 ? (
              <button type="button" onClick={() => canContinue && setStep((current) => current + 1)} disabled={!canContinue} className="inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.24em] uppercase text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-35">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="submit" disabled={!canContinue || busy} className="inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.24em] uppercase text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-35">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {features.squareLiveBooking ? "Continue to availability" : "Send booking request"}
              </button>
            )}
          </div>
        ) : null}
      </form>

      <aside className="h-fit border border-[var(--color-brass)]/25 bg-black/25 p-6 lg:sticky lg:top-28">
        <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Your selection</p>
        <dl className="mt-6 space-y-5 text-sm">
          <SummaryRow label="Service" value={selectedService?.name.en ?? "Not selected"} />
          <SummaryRow label="Barber" value={selectedBarber?.name ?? (form.barberSlug === "best-available" ? "Best available" : "Not selected")} />
          <SummaryRow label="Add-ons" value={selectedAddOns.length ? selectedAddOns.map((item) => item.name.en).join(", ") : "None"} />
          <SummaryRow label="Estimated time" value={totalMinutes ? `${totalMinutes} minutes` : "—"} />
          <SummaryRow label="Starting total" value={totalFrom ? `$${totalFrom}` : "—"} strong />
        </dl>
        <div className="mt-7 border-t border-[var(--color-ink-line)] pt-5 text-xs leading-6 text-[var(--color-bone-muted)]">
          {features.squareLiveBooking
            ? "Live availability and the final price are confirmed through the secure booking provider before the appointment is created."
            : "This submits a reservation request. It does not create a confirmed appointment until the lounge responds."}
        </div>
        <p className="mt-5 flex gap-2 text-xs leading-5 text-[var(--color-bone-muted)]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brass)]" /> Payment card information is never collected by this website request form.</p>
      </aside>
    </div>
  );
}

function ServiceStep({ value, onChange, addOns, toggleAddOn }: { value: string; onChange: (value: string) => void; addOns: string[]; toggleAddOn: (slug: string) => void }) {
  return <section><StepHeading number="01" title="Choose a service" copy="Select the closest service. Your barber can refine the plan during consultation." />
    <div className="mt-7 grid gap-3 sm:grid-cols-2">{services.filter((item)=>item.featured).concat(services.filter((item)=>!item.featured).slice(0,8)).map((item)=><button key={item.slug} type="button" onClick={()=>onChange(item.slug)} className={value===item.slug?"choice-card choice-card-active":"choice-card"}><span><strong>{item.name.en}</strong><small>{item.minutes} min · from ${item.from}</small></span>{value===item.slug?<Check className="h-4 w-4"/>:null}</button>)}</div>
    <h3 className="mt-9 text-[10px] tracking-[.28em] uppercase text-[var(--color-brass)]">Optional add-ons</h3>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{serviceAddOns.map((item)=><button key={item.slug} type="button" onClick={()=>toggleAddOn(item.slug)} className={addOns.includes(item.slug)?"choice-card choice-card-active":"choice-card"}><span><strong>{item.name.en}</strong><small>+{item.minutes} min · +${item.price}</small></span>{addOns.includes(item.slug)?<Check className="h-4 w-4"/>:null}</button>)}</div>
  </section>;
}

function BarberStep({ value, onChange, serviceSlug }: { value: string; onChange: (value: string) => void; serviceSlug: string }) {
  const eligible = barbers.filter((barber) => barber.serviceSlugs.includes(serviceSlug));
  return <section><StepHeading number="02" title="Choose a chair" copy="Choose a preferred barber or let the lounge match the service to the best available chair." />
    <div className="mt-7 grid gap-3"><button type="button" onClick={()=>onChange("best-available")} className={value==="best-available"?"choice-card choice-card-active":"choice-card"}><span><strong>Best available</strong><small>Recommended for the earliest suitable opening</small></span>{value==="best-available"?<Check className="h-4 w-4"/>:null}</button>{(eligible.length?eligible:barbers).map((barber)=><button type="button" key={barber.slug} onClick={()=>onChange(barber.slug)} className={value===barber.slug?"choice-card choice-card-active":"choice-card"}><span><strong>{barber.name}</strong><small>{barber.specialties.en}</small></span>{value===barber.slug?<Check className="h-4 w-4"/>:null}</button>)}</div>
  </section>;
}

function VisitStep({ form, update }: { form: FormState; update: <K extends keyof FormState>(key: K, value: FormState[K]) => void }) {
  return <section><StepHeading number="03" title="Tell us about the visit" copy="These brief answers support service preparation and fair client attribution." />
    <div className="mt-7 grid gap-6 sm:grid-cols-2"><Fieldset legend="Have you visited the lounge before?" value={form.firstVisit} onChange={(value)=>update("firstVisit",value as FormState["firstVisit"])} options={[{value:"no",label:"This is my first visit"},{value:"yes",label:"I have visited before"}]}/><Fieldset legend="Have you received services from this barber before?" value={form.preExistingBarberClient} onChange={(value)=>update("preExistingBarberClient",value as FormState["preExistingBarberClient"])} options={[{value:"yes",label:"Yes, before the lounge"},{value:"no",label:"No"}]}/></div>
    <label className="mt-7 block"><span className="form-label">How did you first hear about the lounge?</span><select value={form.source} onChange={(event)=>update("source",event.target.value)} className="form-control"><option value="">Select one</option><option value="google">Google Search or Maps</option><option value="social">Social media</option><option value="walk_in">Walk-in or local signage</option><option value="shop_referral">Referred by a lounge client</option><option value="barber_referral">Referred by a barber</option><option value="event">Event or promotion</option><option value="other">Other</option></select></label>
    <label className="mt-6 block"><span className="form-label">Reference, accessibility, or preparation notes</span><textarea value={form.notes} onChange={(event)=>update("notes",event.target.value)} className="form-control min-h-28" placeholder="Optional" /></label>
  </section>;
}

function ContactStep({ form, update, live }: { form: FormState; update: <K extends keyof FormState>(key: K, value: FormState[K]) => void; live: boolean }) {
  return <section><StepHeading number="04" title="Contact details" copy={live?"The secure booking provider will confirm availability, deposit, and policies before the appointment is created.":"The lounge will use these details to confirm a time. This is a request, not an appointment yet."}/>
    <div className="mt-7 grid gap-5 sm:grid-cols-2"><TextField label="Full name" value={form.name} onChange={(value)=>update("name",value)} autoComplete="name"/><TextField label="Phone" value={form.phone} onChange={(value)=>update("phone",value)} autoComplete="tel"/><div className="sm:col-span-2"><TextField label="Email" value={form.email} onChange={(value)=>update("email",value)} type="email" autoComplete="email"/></div></div>
    <div className="mt-7 space-y-4"><CheckField checked={form.smsConsent} onChange={(value)=>update("smsConsent",value)} label="I agree to receive transactional appointment and queue text messages. Marketing messages require separate consent."/><CheckField checked={form.policyConsent} onChange={(value)=>update("policyConsent",value)} required label="I have reviewed and accept the booking, deposit, cancellation, and no-show policies."/></div>
  </section>;
}

function Completion({ reference, live, delivered }: { reference: string; live: boolean; delivered: boolean }) {
  const title = live ? "Continue to secure availability" : delivered ? "Your request is with the lounge" : "Complete your request directly";
  const copy = live
    ? "The next secure step confirms the real appointment time, deposit, and final total."
    : delivered
      ? `This request does not reserve a time until the lounge confirms it. For immediate help, call ${business.phone}.`
      : `Online delivery is not active yet. Your selections are not reserved. Please call ${business.phone} or email ${business.email}.`;
  return <section className="py-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--color-brass)]/40 text-[var(--color-brass)]"><Check className="h-7 w-7"/></span><p className="mt-6 text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Reference {reference}</p><h2 className="font-display mt-4 text-4xl">{title}</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[var(--color-bone-muted)]">{copy}</p><a href={business.phoneHref} className="mt-7 inline-flex rounded-full border border-[var(--color-brass)]/45 px-7 py-3 text-[10px] tracking-[.24em] uppercase text-[var(--color-brass)]">Call the lounge</a></section>;
}

function StepHeading({ number, title, copy }: { number: string; title: string; copy: string }) { return <div><p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Step {number}</p><h2 className="font-display mt-3 text-3xl">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-bone-muted)]">{copy}</p></div>; }
function SummaryRow({ label, value, strong=false }: { label: string; value: string; strong?: boolean }) { return <div className="border-b border-[var(--color-ink-line)] pb-4"><dt className="text-[9px] tracking-[.24em] uppercase text-[var(--color-bone-muted)]">{label}</dt><dd className={strong?"font-display mt-2 text-2xl text-[var(--color-brass)]":"mt-2 text-sm text-[var(--color-bone)]"}>{value}</dd></div>; }
function Fieldset({ legend, value, onChange, options }: { legend: string; value: string; onChange: (value: string)=>void; options: Array<{value:string;label:string}> }) { return <fieldset><legend className="form-label">{legend}</legend><div className="mt-3 grid gap-2">{options.map((option)=><label key={option.value} className="choice-card cursor-pointer"><span>{option.label}</span><input type="radio" name={legend} value={option.value} checked={value===option.value} onChange={()=>onChange(option.value)} className="accent-[var(--color-brass)]"/></label>)}</div></fieldset>; }
function TextField({ label, value, onChange, type="text", autoComplete }: { label:string;value:string;onChange:(value:string)=>void;type?:string;autoComplete?:string }) { return <label className="block"><span className="form-label">{label}</span><input required value={value} onChange={(event)=>onChange(event.target.value)} type={type} autoComplete={autoComplete} className="form-control"/></label>; }
function CheckField({ checked, onChange, label, required=false }: { checked:boolean;onChange:(value:boolean)=>void;label:string;required?:boolean }) { return <label className="flex cursor-pointer gap-3 text-sm leading-6 text-[var(--color-bone-muted)]"><input type="checkbox" required={required} checked={checked} onChange={(event)=>onChange(event.target.checked)} className="mt-1 accent-[var(--color-brass)]"/><span>{label}</span></label>; }
