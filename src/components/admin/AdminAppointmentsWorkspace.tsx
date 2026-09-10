"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, RefreshCw, Search, UserRound, WalletCards } from "lucide-react";

type Appointment = {
  id: string;
  public_reference: string;
  client_id: string | null;
  auth_user_id: string | null;
  client_name_snapshot: string;
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
  deposit_status: string;
  booking_source: string;
};

type Barber = {
  id: string;
  staff_user_id: string | null;
  display_name: string;
  availability_status: string;
  accepting_walk_ins: boolean;
};

type Schedule = { id: string; barber_profile_id: string; weekday: number; starts_at: string; ends_at: string; effective_from: string | null; effective_to: string | null; active: boolean };
type TimeOff = { id: string; barber_profile_id: string; starts_at: string; ends_at: string; reason: string | null; status: string; availability_kind: string | null };
type CalendarPayload = { ok: boolean; generatedAt?: string; timezone: string; location: string; startDate: string; endDate: string; days: string[]; barbers: Barber[]; appointments: Appointment[]; schedules: Schedule[]; timeOff: TimeOff[]; message?: string };

type PatchResponse = { ok?: boolean; message?: string; status?: string };

function localDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function appointmentDate(value: string) {
  return localDate(new Date(value));
}

function time(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00Z`));
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function pretty(value: string | null | undefined) {
  return String(value ?? "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scheduleTime(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  const date = new Date(Date.UTC(2026, 0, 1, hour, minute));
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(date);
}

export function AdminAppointmentsWorkspace() {
  const [startDate, setStartDate] = useState(() => localDate());
  const [payload, setPayload] = useState<CalendarPayload | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [search, setSearch] = useState("");
  const [barberFilter, setBarberFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [reassignBarber, setReassignBarber] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/calendar?start=${encodeURIComponent(startDate)}&days=7`, { cache: "no-store" }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as CalendarPayload | null : null;
    if (!response?.ok || !result?.ok) {
      setMessage(result?.message ?? "The appointment calendar could not be loaded.");
      return;
    }
    setPayload(result);
    setSelected((current) => current ? result.appointments.find((item) => item.id === current.id) ?? null : null);
    setMessage("");
  }, [startDate]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 15000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    setReassignBarber(selected.barber_profile_id);
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(selected.starts_at));
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
    setRescheduleAt(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`);
  }, [selected]);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (payload?.appointments ?? []).filter((item) => {
      if (barberFilter && item.barber_profile_id !== barberFilter) return false;
      if (!query) return true;
      return [item.client_name_snapshot, item.client_email_snapshot, item.client_phone_snapshot, item.public_reference, item.service_name_snapshot, item.barber_name_snapshot].some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [barberFilter, payload, search]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    setBusy(action); setMessage("");
    const response = await fetch("/api/admin/appointments", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ appointmentId: selected.id, action, reason: `Calendar: ${action.replaceAll("_", " ")}`, ...extra }) }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as PatchResponse | null : null;
    setMessage(result?.message ?? (result?.ok ? "Appointment updated." : "The appointment could not be updated."));
    if (result?.ok) await load();
    setBusy(null);
  }

  if (!payload) return <div className="rounded-2xl border border-[var(--color-ink-line)] p-8 text-sm text-[var(--color-bone-muted)]">Loading the live appointment calendar…</div>;

  return <div className="grid gap-6">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[10px] uppercase tracking-[.24em] text-[var(--color-brass)]">Paid & confirmed schedule</p><h1 className="font-display mt-2 text-4xl sm:text-5xl">Appointments Calendar</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">A live seven-day chair calendar showing paid appointments, barber working hours and approved unavailability. It refreshes automatically without exposing unpaid checkout holds.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/book" target="_blank" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] uppercase tracking-[.14em] text-black"><CalendarDays className="h-4 w-4" />New booking</Link><Link href="/admin/payments" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] uppercase tracking-[.14em]"><WalletCards className="h-4 w-4" />Payments</Link><Link href="/admin/time-off" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] uppercase tracking-[.14em]">Availability</Link></div>
    </header>

    <section className="grid gap-3 md:grid-cols-4">
      <Metric label="Week appointments" value={String(payload.appointments.length)} />
      <Metric label="Confirmed" value={String(payload.appointments.filter((item) => item.status === "confirmed").length)} />
      <Metric label="In service" value={String(payload.appointments.filter((item) => item.status === "in_service").length)} />
      <Metric label="Barbers scheduled" value={String(payload.barbers.length)} />
    </section>

    <section className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-4 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[auto_minmax(260px,1fr)_220px_auto] xl:items-end">
        <div className="flex gap-2"><button type="button" onClick={() => setStartDate(shiftDate(startDate, -7))} className="grid h-12 w-12 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => setStartDate(localDate())} className="min-h-12 rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] uppercase tracking-[.14em]">Today</button><button type="button" onClick={() => setStartDate(shiftDate(startDate, 7))} className="grid h-12 w-12 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label="Next week"><ChevronRight className="h-4 w-4" /></button></div>
        <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Search<span className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] pl-10 pr-4 text-sm normal-case tracking-normal" placeholder="Client, reference, service or barber" /></span></label>
        <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Barber<select value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal"><option value="">All barbers</option>{payload.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.display_name}</option>)}</select></label>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] uppercase tracking-[.14em]"><RefreshCw className="h-4 w-4" />Refresh</button>
      </div>
    </section>

    {message ? <div className="rounded-xl border border-[var(--color-brass)]/25 bg-[var(--color-brass)]/5 p-4 text-sm">{message}</div> : null}

    <section className="overflow-x-auto rounded-2xl border border-[var(--color-ink-line)] bg-[#0a0a0a]">
      <div className="min-w-[1540px]">
        <div className="grid grid-cols-[220px_repeat(7,minmax(185px,1fr))] border-b border-[var(--color-ink-line)] bg-white/[.025]">
          <div className="p-4"><p className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]">Chair calendar</p><p className="mt-1 text-xs text-[var(--color-bone-muted)]">{payload.location}</p></div>
          {payload.days.map((day) => <div key={day} className={`border-l border-[var(--color-ink-line)] p-4 ${day === localDate() ? "bg-[var(--color-brass)]/5" : ""}`}><p className="text-xs font-medium">{dayLabel(day)}</p><p className="mt-1 text-[9px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{day === localDate() ? "Today" : day}</p></div>)}
        </div>
        {(barberFilter ? payload.barbers.filter((barber) => barber.id === barberFilter) : payload.barbers).map((barber) => <BarberCalendarRow key={barber.id} barber={barber} days={payload.days} schedules={payload.schedules} timeOff={payload.timeOff} appointments={filteredAppointments.filter((item) => item.barber_profile_id === barber.id)} selectedId={selected?.id ?? null} onSelect={setSelected} />)}
      </div>
    </section>

    {selected ? <section className="grid gap-4 rounded-2xl border border-[var(--color-brass)]/25 bg-[var(--color-brass)]/[.035] p-5 xl:grid-cols-[1.15fr_.85fr]">
      <div><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]">{selected.public_reference}</p><h2 className="font-display mt-2 text-3xl">{selected.client_name_snapshot}</h2><p className="mt-2 text-sm text-[var(--color-bone-muted)]">{selected.service_name_snapshot} with {selected.barber_name_snapshot}</p></div><span className="rounded-full border border-emerald-400/25 px-3 py-2 text-[10px] uppercase tracking-[.12em] text-emerald-300">Paid · {pretty(selected.status)}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Info label="Appointment" value={`${dayLabel(appointmentDate(selected.starts_at))} · ${time(selected.starts_at)}`} /><Info label="Duration" value={`${selected.service_duration_snapshot_minutes} minutes`} /><Info label="Service total" value={money(selected.service_price_snapshot_cents)} /><Info label="Phone" value={selected.client_phone_snapshot ?? "Not provided"} /><Info label="Email" value={selected.client_email_snapshot ?? "Not provided"} /><Info label="Source" value={pretty(selected.booking_source)} /></div></div>
      <div className="grid gap-4"><div><p className="text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Appointment actions</p><div className="mt-3 grid grid-cols-2 gap-2"><Action label="Check in" disabled={busy !== null || selected.status !== "confirmed"} onClick={() => void act("check_in")} /><Action label="Start service" disabled={busy !== null || !["checked_in", "assigned"].includes(selected.status)} onClick={() => void act("in_service")} /><Action label="Complete" disabled={busy !== null || selected.status !== "in_service"} onClick={() => void act("complete")} /><Action label="No show" disabled={busy !== null || !["confirmed", "checked_in", "assigned"].includes(selected.status)} onClick={() => void act("no_show")} /><Action label="Cancel" disabled={busy !== null || ["completed", "cancelled_by_client", "cancelled_by_business", "no_show"].includes(selected.status)} onClick={() => void act("cancel")} /></div></div><label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Reassign barber<select value={reassignBarber} onChange={(event) => setReassignBarber(event.target.value)} className="min-h-11 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal">{payload.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.display_name}</option>)}</select></label><button type="button" disabled={busy !== null || reassignBarber === selected.barber_profile_id} onClick={() => void act("reassign", { barberProfileId: reassignBarber })} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] uppercase tracking-[.14em] disabled:opacity-40">Save barber</button><label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Reschedule<input type="datetime-local" value={rescheduleAt} onChange={(event) => setRescheduleAt(event.target.value)} className="min-h-11 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal" /></label><button type="button" disabled={busy !== null || !rescheduleAt} onClick={() => void act("reschedule", { startsAt: new Date(`${rescheduleAt}:00-04:00`).toISOString() })} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] uppercase tracking-[.14em] disabled:opacity-40">Save new time</button></div>
    </section> : null}
  </div>;
}

function BarberCalendarRow({ barber, days, schedules, timeOff, appointments, selectedId, onSelect }: { barber: Barber; days: string[]; schedules: Schedule[]; timeOff: TimeOff[]; appointments: Appointment[]; selectedId: string | null; onSelect: (item: Appointment) => void }) {
  return <div className="grid grid-cols-[220px_repeat(7,minmax(185px,1fr))] border-b border-[var(--color-ink-line)] last:border-0">
    <div className="p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-brass)]/10 text-[var(--color-brass)]"><UserRound className="h-4 w-4" /></span><div><strong className="text-sm">{barber.display_name}</strong><p className="mt-1 text-[9px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{pretty(barber.availability_status)}{barber.accepting_walk_ins ? " · Walk-ins" : ""}</p></div></div></div>
    {days.map((day) => {
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
      const daySchedules = schedules.filter((schedule) => schedule.barber_profile_id === barber.id && schedule.weekday === weekday && (!schedule.effective_from || schedule.effective_from <= day) && (!schedule.effective_to || schedule.effective_to >= day));
      const dayStart = new Date(`${day}T00:00:00-04:00`).getTime();
      const dayEnd = new Date(`${shiftDate(day, 1)}T00:00:00-04:00`).getTime();
      const dayOff = timeOff.filter((block) => block.barber_profile_id === barber.id && new Date(block.starts_at).getTime() < dayEnd && new Date(block.ends_at).getTime() > dayStart);
      const dayAppointments = appointments.filter((item) => appointmentDate(item.starts_at) === day);
      return <div key={day} className={`min-h-[190px] border-l border-[var(--color-ink-line)] p-2.5 ${day === localDate() ? "bg-[var(--color-brass)]/[.025]" : ""}`}>
        <div className="mb-2 flex flex-wrap gap-1">{daySchedules.length ? daySchedules.map((schedule) => <span key={schedule.id} className="rounded-full border border-emerald-400/20 px-2 py-1 text-[8px] uppercase tracking-[.1em] text-emerald-300">Available {scheduleTime(schedule.starts_at)}–{scheduleTime(schedule.ends_at)}</span>) : <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-[.1em] text-[var(--color-bone-muted)]">Not scheduled</span>}{dayOff.map((block) => <span key={block.id} className="rounded-full border border-red-400/20 px-2 py-1 text-[8px] uppercase tracking-[.1em] text-red-200">Unavailable {time(block.starts_at)}–{time(block.ends_at)}</span>)}</div>
        <div className="grid gap-2">{dayAppointments.map((item) => <button type="button" key={item.id} onClick={() => onSelect(item)} className={`rounded-xl border p-3 text-left transition ${selectedId === item.id ? "border-[var(--color-brass)] bg-[var(--color-brass)]/10" : "border-white/[.08] bg-white/[.025] hover:border-[var(--color-brass)]/40"}`}><div className="flex items-center justify-between gap-2"><strong className="text-xs">{time(item.starts_at)}</strong><span className="text-[8px] uppercase tracking-[.1em] text-emerald-300">Paid</span></div><p className="mt-2 truncate text-sm font-medium">{item.client_name_snapshot}</p><p className="mt-1 text-[10px] leading-4 text-[var(--color-bone-muted)]">{item.service_name_snapshot}</p><p className="mt-2 text-[8px] uppercase tracking-[.1em] text-[var(--color-brass)]">{pretty(item.status)}</p></button>)}</div>
      </div>;
    })}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <article className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-5"><p className="text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">{label}</p><p className="font-display mt-2 text-3xl">{value}</p></article>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--color-ink-line)] p-3"><dt className="text-[8px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>; }
function Action({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="min-h-10 rounded-full border border-[var(--color-ink-line)] px-3 text-[9px] uppercase tracking-[.12em] disabled:opacity-35">{label}</button>; }
