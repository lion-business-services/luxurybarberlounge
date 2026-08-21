"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus, Save } from "lucide-react";

type Service = {
  id: string;
  slug: string;
  name: unknown;
  short_description: unknown;
  price_cents: number | null;
  duration_minutes: number | null;
  deposit_cents: number | null;
  bookable: boolean;
  active: boolean;
  square_catalog_id: string | null;
};

function text(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    return typeof map.en === "string" ? map.en : typeof map.es === "string" ? map.es : "";
  }
  return "";
}

export function AdminServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/services", { cache: "no-store" });
    const body = await response.json() as { services?: Service[]; message?: string };
    if (!response.ok) throw new Error(body.message ?? "Services could not be loaded.");
    const next = body.services ?? [];
    setServices(next);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((error) => setMessage(error instanceof Error ? error.message : "Services could not be loaded."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const number = (key: string) => form.get(key) ? Math.round(Number(form.get(key)) * (key === "durationMinutes" ? 1 : 100)) : null;
    const response = await fetch("/api/admin/services", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), description: form.get("description"), priceCents: number("price"), durationMinutes: number("durationMinutes"), depositCents: number("deposit"), bookable: form.get("bookable") === "on" }) });
    const body = await response.json() as { message?: string };
    setMessage(response.ok ? "Service created." : body.message ?? "The service could not be created.");
    if (response.ok) { event.currentTarget.reset(); setOpen(false); await load(); }
    setBusy(false);
  }



  async function toggle(service: Service) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/services", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: service.id, active: !service.active }) });
    const body = await response.json() as { message?: string };
    setMessage(response.ok ? `${text(service.name)} ${service.active ? "paused" : "activated"}.` : body.message ?? "The service could not be updated.");
    if (response.ok) await load();
    setBusy(false);
  }

  return <div className="grid gap-5">
    <section className="portal-card">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Service menu</p><h2 className="font-display mt-2 text-2xl">Services offered</h2></div><div className="flex flex-wrap gap-2"><button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] uppercase tracking-[.16em] text-[var(--color-ink)]"><Plus className="h-4 w-4" />Add service</button></div></div>
      {open ? <form onSubmit={create} className="mt-5 grid gap-4 md:grid-cols-2"><label><span className="form-label">Service name</span><input name="name" required className="form-control" /></label><label><span className="form-label">Duration in minutes</span><input name="durationMinutes" type="number" min="5" step="5" className="form-control" /></label><label><span className="form-label">Price</span><input name="price" type="number" min="0" step="0.01" className="form-control" placeholder="Leave blank if not final" /></label><label><span className="form-label">Deposit</span><input name="deposit" type="number" min="0" step="0.01" className="form-control" placeholder="Leave blank if none" /></label><label className="md:col-span-2"><span className="form-label">Short description</span><textarea name="description" className="form-control min-h-24" /></label><label className="flex items-center gap-3 text-sm"><input name="bookable" type="checkbox" defaultChecked className="accent-[var(--color-brass)]" />Available for booking</label><button disabled={busy} className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] uppercase tracking-[.16em] text-black disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save service</button></form> : null}
      {message ? <p className="mt-4 text-xs text-[var(--color-bone-muted)]" role="status">{message}</p> : null}
    </section>
    <section className="grid gap-3">
      {services.map((service) => <article key={service.id} className="grid gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-xl">{text(service.name)}</h3><span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{service.active ? "Active" : "Paused"}</span></div><p className="mt-1 text-xs leading-5 text-[var(--color-bone-muted)]">{text(service.short_description) || "No description yet."}</p><p className="mt-2 text-sm text-[var(--color-bone-muted)]"><strong className="text-[var(--color-bone)]">{service.price_cents == null ? "Price pending" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(service.price_cents / 100)}</strong> · {service.duration_minutes ? `${service.duration_minutes} minutes` : "Duration pending"}</p></div>{/* Square catalog IDs are developer configuration and are managed by the
          sync job; surfacing raw variation IDs to the shop owner invites
          accidental breakage of live bookings. */}
      <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void toggle(service)} className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase tracking-[.14em]">{service.active ? "Pause" : "Activate"}</button></div></article>)}
      {!services.length ? <div className="portal-empty">No services have been added yet.</div> : null}
    </section>
  </div>;
}
