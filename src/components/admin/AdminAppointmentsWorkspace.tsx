"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, MailWarning, RefreshCw, Search, UserRoundCheck, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import styles from "./admin-portal.module.css";

type Appointment = {
  id: string;
  public_reference: string;
  client_name_snapshot: string;
  client_declared_status?: "new" | "existing" | "unsure" | null;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  service_name_snapshot: string;
  service_price_snapshot_cents: number;
  service_duration_snapshot_minutes: number;
  barber_profile_id: string;
  barber_name_snapshot: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: string;
  booking_source: string;
  deposit_required_cents: number;
  deposit_status: string;
  client_notes: string | null;
  internal_notes: string | null;
  formsubmit_status: string;
  client_confirmation_status: string;
  barber_notification_status: string;
  sync_status: string;
  formsubmit_delivery: { status: string; attempt_count: number; last_error: string | null; sent_at: string | null } | null;
};
type Barber = { id: string; display_name: string | Record<string, string>; active: boolean; status: string };
type Payload = { ok: boolean; appointments: Appointment[]; barbers: Barber[]; summary: Record<string, number>; message?: string };

const statusOptions = ["all", "pending_confirmation", "confirmed", "checked_in", "assigned", "in_service", "completed", "cancelled_by_client", "cancelled_by_business", "no_show", "declined"];

export function AdminAppointmentsWorkspace() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [barberFilter, setBarberFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ status });
    if (barberFilter) params.set("barber", barberFilter);
    if (dateFilter) params.set("date", dateFilter);
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    const response = await fetch(`/api/admin/appointments?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const body = response ? await response.json().catch(() => null) as Payload | null : null;
    const next = body?.ok ? body : { ok: false, appointments: [], barbers: [], summary: {}, message: body?.message || "Appointments could not be loaded." };
    setPayload(next);
    setSelected((current) => current ? next.appointments.find((item) => item.id === current.id) ?? null : null);
    return next;
  }, [barberFilter, dateFilter, sourceFilter, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference) return;
    const timer = window.setTimeout(() => setSearch(reference), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payload?.appointments ?? [];
    return (payload?.appointments ?? []).filter((item) => [item.public_reference, item.client_name_snapshot, item.client_email_snapshot, item.client_phone_snapshot, item.service_name_snapshot, item.barber_name_snapshot].some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [payload, search]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    setBusy(action); setMessage("");
    const response = await fetch("/api/admin/appointments", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ appointmentId: selected.id, action, reason: `Owner dashboard: ${action.replaceAll("_", " ")}`, ...extra }) }).catch(() => null);
    const body = response ? await response.json().catch(() => null) as { ok?: boolean; message?: string; status?: string } | null : null;
    setMessage(body?.message || (body?.ok ? "Appointment updated." : "The appointment could not be updated."));
    if (body?.ok || response?.status === 202) await load();
    setBusy(null);
  }

  if (!payload) return <div className={styles.empty}>Loading the live appointment schedule…</div>;
  return <div className={styles.grid}>
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[9px] tracking-[.24em] uppercase text-[var(--color-brass)]">Booking operations</p><h1 className="font-display mt-2 text-4xl sm:text-5xl">Appointments</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-bone-muted)]">Today’s schedule, client check-in, barber assignment, and delivery status in one straightforward workspace.</p></div>
      <a href="/book" target="_blank" className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]"><CalendarDays className="h-4 w-4" />New booking</a>
    </header>

    <section className={styles.metricGrid} aria-label="Appointment summary">
      <Metric label="Today" value={payload.summary.today ?? 0} />
      <Metric label="Confirmed" value={payload.summary.confirmed ?? 0} />
      <Metric label="Checked in" value={payload.summary.checked_in ?? 0} />
      <Metric label="In service" value={payload.summary.in_service ?? 0} />
    </section>

    <section className={styles.card}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_180px_180px_auto] xl:items-end">
        <label className="grid gap-2 text-[9px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">Search<span className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] pl-10 pr-4 text-sm normal-case tracking-normal" placeholder="Client, reference, service, barber" /></span></label>
        <label className="grid gap-2 text-[9px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">Date<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal" /></label>
        <label className="grid gap-2 text-[9px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal">{statusOptions.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label className="grid gap-2 text-[9px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">Barber<select value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal"><option value="">All barbers</option>{payload.barbers.map((item) => <option value={item.id} key={item.id}>{barberName(item.display_name)}</option>)}</select></label>
        <label className="grid gap-2 text-[9px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">Source<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal"><option value="all">All sources</option><option value="website">Website</option><option value="qr_business_card">QR code</option><option value="admin">Admin</option><option value="walk_in">Walk-in</option></select></label>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 text-[9px] tracking-[.15em] uppercase"><RefreshCw className="h-4 w-4" />Refresh</button>
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
      <div className={styles.card}>
        {visible.length ? <div className="grid gap-2">{visible.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); setMessage(""); }} className={`grid w-full gap-3 rounded-xl border p-4 text-left transition sm:grid-cols-[150px_1fr_auto] sm:items-center ${selected?.id === item.id ? "border-[var(--color-brass)] bg-[var(--color-brass)]/10" : "border-[var(--color-ink-line)] hover:border-[var(--color-brass)]/50"}`}><div><p className="text-[8px] tracking-[.18em] uppercase text-[var(--color-brass)]">Appointment</p><p className="mt-0.5 text-sm font-medium text-[var(--color-bone)]">{dateTime(item.starts_at, item.timezone)}</p><p className="mt-1 text-[9px] tracking-[.12em] uppercase text-[var(--color-bone-muted)]/70">Ref {item.public_reference}</p></div><div><strong className="text-sm">{item.client_name_snapshot}</strong><p className="mt-1 text-xs text-[var(--color-bone-muted)]">{item.service_name_snapshot} · {item.barber_name_snapshot}</p></div><div className="flex flex-col items-end gap-2"><Status value={item.status} /><ClientOrigin value={item.client_declared_status} /></div></button>)}</div> : <div className={styles.empty}>No appointments match this view.</div>}
      </div>
      <aside className={styles.card}>{selected ? <AppointmentDetail item={selected} barbers={payload.barbers} busy={busy} message={message} onAction={act} /> : <div className="grid min-h-64 place-items-center text-center"><div><Clock3 className="mx-auto h-7 w-7 text-[var(--color-brass)]" /><h2 className="font-display mt-4 text-2xl">Choose an appointment</h2><p className="mt-2 text-xs leading-5 text-[var(--color-bone-muted)]">Details and daily actions appear here.</p></div></div>}</aside>
    </section>
  </div>;
}

function AppointmentDetail({ item, barbers, busy, message, onAction }: { item: Appointment; barbers: Barber[]; busy: string | null; message: string; onAction: (action: string, extra?: Record<string, unknown>) => Promise<void> }) {
  const [barber, setBarber] = useState(item.barber_profile_id);
  const [newTime, setNewTime] = useState(new Date(item.starts_at).toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  return <div>
    <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">{item.public_reference}</p><h2 className="font-display mt-2 text-3xl">{item.client_name_snapshot}</h2><p className="mt-2 text-sm text-[var(--color-bone-muted)]">{item.service_name_snapshot} with {item.barber_name_snapshot}</p></div><div className="flex flex-col items-end gap-2"><Status value={item.status} /><ClientOrigin value={item.client_declared_status} /></div></div>
    <dl className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Date" value={dateTime(item.starts_at, item.timezone)} /><Field label="Duration" value={`${item.service_duration_snapshot_minutes} minutes`} /><Field label="Phone" value={item.client_phone_snapshot || "Not provided"} /><Field label="Email" value={item.client_email_snapshot || "Not provided"} /><Field label="Price" value={money(item.service_price_snapshot_cents)} /><Field label="Deposit" value={`${pretty(item.deposit_status)}${item.deposit_required_cents ? ` · ${money(item.deposit_required_cents)}` : ""}`} /></dl>
    {item.client_notes ? <div className="mt-5 rounded-xl border border-[var(--color-ink-line)] p-4"><p className="text-[9px] tracking-[.15em] uppercase text-[var(--color-brass)]">Client note</p><p className="mt-2 text-sm leading-6 text-[var(--color-bone-muted)]">{item.client_notes}</p></div> : null}
    <div className="mt-6 grid gap-2 sm:grid-cols-2"><Action label="Confirm" icon={Check} disabled={busy !== null || item.status === "confirmed"} onClick={() => onAction("confirm")} /><Action label="Check in" icon={UserRoundCheck} disabled={busy !== null || item.status !== "confirmed"} onClick={() => onAction("check_in")} /><Action label="Start service" disabled={busy !== null || !["checked_in", "assigned"].includes(item.status)} onClick={() => onAction("in_service")} /><Action label="Complete" disabled={busy !== null || item.status !== "in_service"} onClick={() => onAction("complete")} /><Action label="No show" disabled={busy !== null || !["confirmed", "checked_in", "assigned"].includes(item.status)} onClick={() => onAction("no_show")} /><Action label="Cancel" icon={X} disabled={busy !== null || ["completed", "cancelled_by_client", "cancelled_by_business", "no_show"].includes(item.status)} onClick={() => onAction("cancel")} /></div>
    <div className="mt-6 grid gap-3"><label className="grid gap-2 text-[9px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">Assign barber<select value={barber} onChange={(event) => setBarber(event.target.value)} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal">{barbers.map((item) => <option value={item.id} key={item.id}>{barberName(item.display_name)}</option>)}</select></label><button type="button" disabled={busy !== null || barber === item.barber_profile_id} onClick={() => void onAction("reassign", { barberProfileId: barber })} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] tracking-[.14em] uppercase disabled:opacity-40">Save barber</button></div>
    <div className="mt-6 grid gap-3"><label className="grid gap-2 text-[9px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">Reschedule<input type="datetime-local" value={newTime} onChange={(event) => setNewTime(event.target.value)} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal" /></label><button type="button" disabled={busy !== null} onClick={() => void onAction("reschedule", { startsAt: new Date(newTime).toISOString() })} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] tracking-[.14em] uppercase disabled:opacity-40">Confirm new time</button></div>
    <div className="mt-6 grid gap-3"><label className="grid gap-2 text-[9px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">Internal note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] p-4 text-sm normal-case tracking-normal" /></label><button type="button" disabled={busy !== null || !note.trim()} onClick={() => { void onAction("note", { note }); setNote(""); }} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] tracking-[.14em] uppercase disabled:opacity-40">Save note</button></div>
    <div className="mt-6 rounded-xl border border-[var(--color-ink-line)] p-4"><div className="flex items-center gap-2"><MailWarning className="h-4 w-4 text-[var(--color-brass)]" /><strong className="text-xs">Administrative email: {pretty(item.formsubmit_status)}</strong></div>{item.formsubmit_delivery?.last_error ? <p className="mt-2 text-xs text-[var(--color-bone-muted)]">Delivery needs another attempt. The appointment itself remains saved.</p> : null}<button type="button" disabled={busy !== null || item.formsubmit_status === "sent"} onClick={() => void onAction("retry_formsubmit")} className="mt-3 text-[9px] tracking-[.14em] uppercase text-[var(--color-brass)] disabled:opacity-40">Retry administrative email</button></div>
    {message ? <p role="status" className="mt-5 text-xs leading-5 text-[var(--color-bone-muted)]">{message}</p> : null}
  </div>;
}

function Action({ label, icon: Icon, disabled, onClick }: { label: string; icon?: LucideIcon; disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] tracking-[.14em] uppercase disabled:opacity-35">{Icon ? <Icon className="h-4 w-4" /> : null}{label}</button>; }
function Metric({ label, value }: { label: string; value: number }) { return <article className={styles.metric}><p className="text-[8px] tracking-[.16em] uppercase text-[var(--color-bone-muted)]">{label}</p><p className={styles.metricValue}>{value}</p></article>; }

function ClientOrigin({ value }: { value?: string | null }) {
  const map: Record<string, { label: string; cls: string; hint: string }> = {
    new: {
      label: "NEW CLIENT",
      cls: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300",
      hint: "Shop-generated \u00b7 70/30 \u00b7 barber claim blocked",
    },
    existing: {
      label: "CLAIMS EXISTING",
      cls: "border-amber-400/50 bg-amber-400/10 text-amber-300",
      hint: "Unverified claim \u00b7 defaults to SHOP until proven",
    },
    unsure: {
      label: "UNSURE",
      cls: "border-slate-400/40 bg-slate-400/10 text-slate-300",
      hint: "Defaults to SHOP attribution",
    },
  };
  const entry = value ? map[value] : undefined;
  if (!entry) {
    return (
      <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[9px] tracking-[.14em] text-[var(--color-bone-muted)]">
        NOT RECORDED
      </span>
    );
  }
  return (
    <span
      title={entry.hint}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] tracking-[.14em] ${entry.cls}`}
    >
      {entry.label}
    </span>
  );
}

function Status({ value }: { value: string }) { return <span className="w-fit rounded-full bg-[var(--color-brass)]/10 px-3 py-2 text-[8px] tracking-[.12em] uppercase text-[var(--color-brass)]">{pretty(value)}</span>; }
function Field({ label, value }: { label: string; value: string }) { return <div><dt className="text-[8px] tracking-[.15em] uppercase text-[var(--color-bone-muted)]">{label}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>; }
function pretty(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100); }
function dateTime(value: string, timeZone: string) { return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function barberName(value: Barber["display_name"]) { return typeof value === "string" ? value : value.en || value.es || "Barber"; }
