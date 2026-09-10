"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  History,
  Mail,
  Phone,
  ReceiptText,
  RefreshCw,
  Search,
  Scissors,
  UserCheck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { zonedDateTimeToUtc } from "@/lib/booking/timezone";

const SHOP_TIME_ZONE = "America/New_York";

type PaymentDetail = {
  status: string;
  paidPrincipalCents: number;
  squareCollectedCents: number;
  amountDueCents: number;
  tipCents: number;
  processingFeeCents: number;
  paymentMethod: string;
  cardBrands: string[];
  paidAt: string | null;
  receiptNumber: string | null;
  receiptUrl: string | null;
  squarePaymentId: string | null;
  links: Array<{ id: string; purpose: string | null; amountCents: number; status: string | null; paidAt: string | null }>;
};

type ClientInsights = {
  type: "new" | "returning" | "returning_declared" | "unknown";
  declaredStatus: string;
  previousVisitCount: number;
  firstTrackedVisitAt: string | null;
  lastTrackedVisitAt: string | null;
  clientSince: string | null;
  clientProfileId: string | null;
  preferredLanguage: string | null;
  acquisitionSource: string | null;
  referralSource: string | null;
  profileStatus: string | null;
};

type AppointmentNote = {
  id: string;
  note: string;
  clientVisible: boolean;
  createdAt: string | null;
};

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
  addon_snapshot: unknown;
  barber_profile_id: string;
  barber_name_snapshot: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: string;
  deposit_status: string;
  deposit_required_cents: number;
  booking_source: string;
  campaign_source: string | null;
  campaign_medium: string | null;
  campaign_name: string | null;
  referral_source: string | null;
  client_declared_status: string | null;
  client_notes: string | null;
  internal_notes: string | null;
  policy_version: string | null;
  policy_accepted_at: string | null;
  email_consent: boolean;
  sms_consent: boolean;
  formsubmit_status: string | null;
  client_confirmation_status: string | null;
  barber_notification_status: string | null;
  sync_status: string | null;
  created_at: string;
  updated_at: string;
  payment: PaymentDetail;
  clientInsights: ClientInsights;
  notes: AppointmentNote[];
  automationHealth: {
    adminEmail: string | null;
    clientConfirmation: string | null;
    barberNotification: string | null;
    sync: string | null;
  };
};

type Barber = {
  id: string;
  staff_user_id: string | null;
  display_name: string;
  availability_status: string;
  accepting_walk_ins: boolean;
};

type Schedule = {
  id: string;
  barber_profile_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  effective_from: string | null;
  effective_to: string | null;
  active: boolean;
};

type TimeOff = {
  id: string;
  barber_profile_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  status: string;
  availability_kind: string | null;
};

type CalendarPayload = {
  ok: boolean;
  generatedAt?: string;
  timezone: string;
  location: string;
  startDate: string;
  endDate: string;
  days: string[];
  barbers: Barber[];
  appointments: Appointment[];
  schedules: Schedule[];
  timeOff: TimeOff[];
  message?: string;
};

type PatchResponse = { ok?: boolean; message?: string; status?: string };

function localDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
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
  return new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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

function localInputToUtc(value: string) {
  const [date, clock] = value.split("T");
  if (!date || !clock) return null;
  const normalizedClock = clock.length === 5 ? `${clock}:00` : clock;
  const instant = zonedDateTimeToUtc(date, normalizedClock, SHOP_TIME_ZONE);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

function clientTypeLabel(value: ClientInsights["type"]) {
  if (value === "new") return "New client";
  if (value === "returning") return "Returning client";
  if (value === "returning_declared") return "Returning · client declared";
  return "Client history not established";
}

function addonSummary(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return "None";
  return value.map((item) => {
    if (typeof item === "string") return pretty(item);
    if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      const label = row.name ?? row.label ?? row.slug ?? row.title;
      if (typeof label === "string") return pretty(label);
    }
    return "Add-on";
  }).join(", ");
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
  const [internalNote, setInternalNote] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/calendar?start=${encodeURIComponent(startDate)}&days=7`, { cache: "no-store" }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as CalendarPayload | null : null;
    if (!response?.ok || !result?.ok) {
      setMessage("The appointment calendar could not be loaded. Please refresh and try again.");
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
    setInternalNote("");
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(selected.starts_at));
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
    setRescheduleAt(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selected]);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (payload?.appointments ?? []).filter((item) => {
      if (barberFilter && item.barber_profile_id !== barberFilter) return false;
      if (!query) return true;
      return [
        item.client_name_snapshot,
        item.client_email_snapshot,
        item.client_phone_snapshot,
        item.public_reference,
        item.service_name_snapshot,
        item.barber_name_snapshot,
        clientTypeLabel(item.clientInsights.type),
      ].some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [barberFilter, payload, search]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    setBusy(action);
    setMessage("");
    const response = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appointmentId: selected.id, action, reason: `Calendar: ${action.replaceAll("_", " ")}`, ...extra }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as PatchResponse | null : null;
    setMessage(result?.ok ? (result.message ?? "Appointment updated.") : "The appointment could not be updated. Please try again.");
    if (result?.ok) {
      if (action === "note") setInternalNote("");
      await load();
    }
    setBusy(null);
  }

  if (!payload) return <div className="rounded-2xl border border-[var(--color-ink-line)] p-8 text-sm text-[var(--color-bone-muted)]">Loading the live appointment calendar…</div>;

  return <div className="grid gap-6">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[.24em] text-[var(--color-brass)]">Paid & confirmed schedule</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">Appointments Calendar</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">A live seven-day chair calendar showing paid appointments, barber working hours and approved unavailability. Click any appointment for the full client, payment, visit-history and operational record.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/book" target="_blank" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] uppercase tracking-[.14em] text-black"><CalendarDays className="h-4 w-4" />New booking</Link>
        <Link href="/admin/payments" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] uppercase tracking-[.14em]"><WalletCards className="h-4 w-4" />Payments</Link>
        <Link href="/admin/time-off" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] uppercase tracking-[.14em]">Availability</Link>
      </div>
    </header>

    <section className="grid gap-3 md:grid-cols-4">
      <Metric label="Week appointments" value={String(payload.appointments.length)} />
      <Metric label="Confirmed" value={String(payload.appointments.filter((item) => item.status === "confirmed").length)} />
      <Metric label="In service" value={String(payload.appointments.filter((item) => item.status === "in_service").length)} />
      <Metric label="Barbers scheduled" value={String(payload.barbers.length)} />
    </section>

    <section className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-4 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[auto_minmax(260px,1fr)_220px_auto] xl:items-end">
        <div className="flex gap-2">
          <button type="button" onClick={() => setStartDate(shiftDate(startDate, -7))} className="grid h-12 w-12 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setStartDate(localDate())} className="min-h-12 rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] uppercase tracking-[.14em]">Today</button>
          <button type="button" onClick={() => setStartDate(shiftDate(startDate, 7))} className="grid h-12 w-12 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label="Next week"><ChevronRight className="h-4 w-4" /></button>
        </div>
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

    {selected ? <AppointmentInspector
      appointment={selected}
      barbers={payload.barbers}
      busy={busy}
      rescheduleAt={rescheduleAt}
      reassignBarber={reassignBarber}
      internalNote={internalNote}
      onClose={() => setSelected(null)}
      onRescheduleChange={setRescheduleAt}
      onBarberChange={setReassignBarber}
      onNoteChange={setInternalNote}
      onAct={act}
      onMessage={setMessage}
    /> : null}
  </div>;
}

function AppointmentInspector({ appointment, barbers, busy, rescheduleAt, reassignBarber, internalNote, onClose, onRescheduleChange, onBarberChange, onNoteChange, onAct, onMessage }: {
  appointment: Appointment;
  barbers: Barber[];
  busy: string | null;
  rescheduleAt: string;
  reassignBarber: string;
  internalNote: string;
  onClose: () => void;
  onRescheduleChange: (value: string) => void;
  onBarberChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onAct: (action: string, extra?: Record<string, unknown>) => Promise<void>;
  onMessage: (value: string) => void;
}) {
  const payment = appointment.payment;
  const client = appointment.clientInsights;
  const paidInFull = payment.status === "paid_in_full" || appointment.deposit_status === "paid";
  const paymentMethod = `${pretty(payment.paymentMethod)}${payment.cardBrands.length ? ` · ${payment.cardBrands.join(", ")}` : ""}`;
  const campaign = [appointment.campaign_source, appointment.campaign_medium, appointment.campaign_name].filter(Boolean).join(" · ") || "None recorded";

  return <div className="fixed inset-0 z-[90] flex justify-end bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Appointment details for ${appointment.client_name_snapshot}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="h-full w-full max-w-[780px] overflow-y-auto border-l border-[var(--color-brass)]/25 bg-[#090909] shadow-2xl">
      <div className="sticky top-0 z-10 border-b border-[var(--color-ink-line)] bg-[#090909]/95 px-5 py-4 backdrop-blur-xl sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Appointment details · {appointment.public_reference}</p>
            <h2 className="font-display mt-2 text-3xl sm:text-4xl">{appointment.client_name_snapshot}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 px-3 py-1.5 text-[9px] uppercase tracking-[.12em] text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" />{paidInFull ? "Paid in full" : pretty(appointment.deposit_status)}</span>
              <span className="rounded-full border border-[var(--color-brass)]/25 px-3 py-1.5 text-[9px] uppercase tracking-[.12em] text-[var(--color-brass)]">{clientTypeLabel(client.type)}</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{pretty(appointment.status)}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-ink-line)] hover:border-[var(--color-brass)]/50" aria-label="Close appointment details"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-7">
        <section className="grid gap-3 sm:grid-cols-2">
          <DetailCard icon={<CalendarDays className="h-4 w-4" />} label="Appointment" value={dateTime(appointment.starts_at)} subvalue={`${appointment.service_duration_snapshot_minutes} minutes · ends ${time(appointment.ends_at)}`} />
          <DetailCard icon={<UserRound className="h-4 w-4" />} label="Barber" value={appointment.barber_name_snapshot} subvalue={pretty(appointment.status)} />
          <DetailCard icon={<Scissors className="h-4 w-4" />} label="Service" value={appointment.service_name_snapshot} subvalue={`Add-ons: ${addonSummary(appointment.addon_snapshot)}`} />
          <DetailCard icon={<ReceiptText className="h-4 w-4" />} label="Service price" value={money(appointment.service_price_snapshot_cents)} subvalue={`Reference ${appointment.public_reference}`} />
        </section>

        <section className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.025] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[9px] uppercase tracking-[.16em] text-emerald-300">Payment record</p><h3 className="font-display mt-2 text-2xl">Paid appointment</h3></div>
            {payment.receiptUrl ? <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-emerald-400/25 px-4 text-[9px] uppercase tracking-[.12em] text-emerald-300"><ExternalLink className="h-3.5 w-3.5" />Open Square receipt</a> : null}
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Paid toward service" value={money(payment.paidPrincipalCents)} />
            <Info label="Square collected" value={money(payment.squareCollectedCents)} />
            <Info label="Amount due" value={money(payment.amountDueCents)} />
            <Info label="Payment method" value={paymentMethod} />
            <Info label="Paid at" value={dateTime(payment.paidAt)} />
            <Info label="Receipt" value={payment.receiptNumber ?? payment.squarePaymentId ?? "Recorded in Square"} />
            {payment.tipCents > 0 ? <Info label="Tip" value={money(payment.tipCents)} /> : null}
            {payment.processingFeeCents > 0 ? <Info label="Merchant processing fee" value={money(payment.processingFeeCents)} /> : null}
          </dl>
        </section>

        <section className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]">Client details</p><h3 className="font-display mt-2 text-2xl">{clientTypeLabel(client.type)}</h3></div>
            {client.clientProfileId ? <Link href={`/admin/clients/${client.clientProfileId}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--color-brass)]/25 px-4 text-[9px] uppercase tracking-[.12em] text-[var(--color-brass)]"><UserCheck className="h-3.5 w-3.5" />Open client profile</Link> : null}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailCard icon={<Phone className="h-4 w-4" />} label="Phone" value={appointment.client_phone_snapshot ?? "Not provided"} />
            <DetailCard icon={<Mail className="h-4 w-4" />} label="Email" value={appointment.client_email_snapshot ?? "Not provided"} />
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Client type" value={clientTypeLabel(client.type)} />
            <Info label="Client declared" value={pretty(client.declaredStatus)} />
            <Info label="Previous tracked visits" value={String(client.previousVisitCount)} />
            <Info label="Last tracked visit" value={dateTime(client.lastTrackedVisitAt)} />
            <Info label="Client since" value={dateTime(client.clientSince)} />
            <Info label="Language" value={client.preferredLanguage ? client.preferredLanguage.toUpperCase() : "Not recorded"} />
            <Info label="Acquisition" value={pretty(client.acquisitionSource ?? appointment.booking_source)} />
            <Info label="Referral" value={pretty(client.referralSource ?? appointment.referral_source)} />
            <Info label="Profile status" value={pretty(client.profileStatus)} />
          </dl>
        </section>

        <section className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-5">
          <p className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]">Booking details</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Booking source" value={pretty(appointment.booking_source)} />
            <Info label="Campaign" value={campaign} />
            <Info label="Policy version" value={appointment.policy_version ?? "Not recorded"} />
            <Info label="Policy accepted" value={dateTime(appointment.policy_accepted_at)} />
            <Info label="Booked at" value={dateTime(appointment.created_at)} />
            <Info label="Last updated" value={dateTime(appointment.updated_at)} />
          </dl>
        </section>

        <section className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-5">
          <div className="flex items-center gap-2"><History className="h-4 w-4 text-[var(--color-brass)]" /><p className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]">Notes & history</p></div>
          <div className="mt-4 grid gap-3">
            {appointment.client_notes ? <NoteCard label="Client note" text={appointment.client_notes} /> : null}
            {appointment.internal_notes ? <NoteCard label="Internal appointment note" text={appointment.internal_notes} /> : null}
            {appointment.notes.map((note) => <NoteCard key={note.id} label={note.clientVisible ? "Client-visible note" : "Private shop note"} text={note.note} meta={dateTime(note.createdAt)} />)}
            {!appointment.client_notes && !appointment.internal_notes && appointment.notes.length === 0 ? <p className="text-sm text-[var(--color-bone-muted)]">No notes have been recorded for this appointment.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-5">
          <p className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]">Booking communications</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Health label="Shop confirmation" value={appointment.automationHealth.adminEmail} />
            <Health label="Client confirmation" value={appointment.automationHealth.clientConfirmation} />
            <Health label="Barber confirmation" value={appointment.automationHealth.barberNotification} />
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-brass)]/20 bg-[var(--color-brass)]/[.025] p-5">
          <p className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]">Appointment actions</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Action label="Check in" disabled={busy !== null || appointment.status !== "confirmed"} onClick={() => void onAct("check_in")} />
            <Action label="Start service" disabled={busy !== null || !["checked_in", "assigned"].includes(appointment.status)} onClick={() => void onAct("in_service")} />
            <Action label="Complete" disabled={busy !== null || appointment.status !== "in_service"} onClick={() => void onAct("complete")} />
            <Action label="No show" disabled={busy !== null || !["confirmed", "checked_in", "assigned"].includes(appointment.status)} onClick={() => void onAct("no_show")} />
            <Action label="Cancel" disabled={busy !== null || ["completed", "cancelled_by_client", "cancelled_by_business", "no_show"].includes(appointment.status)} onClick={() => void onAct("cancel")} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Reassign barber<select value={reassignBarber} onChange={(event) => onBarberChange(event.target.value)} className="min-h-11 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal">{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.display_name}</option>)}</select></label>
              <button type="button" disabled={busy !== null || reassignBarber === appointment.barber_profile_id} onClick={() => void onAct("reassign", { barberProfileId: reassignBarber })} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] uppercase tracking-[.14em] disabled:opacity-40">Save barber</button>
            </div>
            <div className="grid gap-2">
              <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Reschedule<input type="datetime-local" value={rescheduleAt} onChange={(event) => onRescheduleChange(event.target.value)} className="min-h-11 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal" /></label>
              <button type="button" disabled={busy !== null || !rescheduleAt} onClick={() => { const startsAt = localInputToUtc(rescheduleAt); if (!startsAt) { onMessage("Choose a valid appointment date and time."); return; } void onAct("reschedule", { startsAt }); }} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] uppercase tracking-[.14em] disabled:opacity-40">Save new time</button>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Internal note<textarea value={internalNote} onChange={(event) => onNoteChange(event.target.value)} rows={3} className="rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 py-3 text-sm normal-case tracking-normal" placeholder="Private note for the shop team" /></label>
            <button type="button" disabled={busy !== null || !internalNote.trim()} onClick={() => void onAct("note", { note: internalNote.trim(), clientVisible: false })} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] uppercase tracking-[.14em] disabled:opacity-40">Save note</button>
          </div>
        </section>
      </div>
    </aside>
  </div>;
}

function BarberCalendarRow({ barber, days, schedules, timeOff, appointments, selectedId, onSelect }: {
  barber: Barber;
  days: string[];
  schedules: Schedule[];
  timeOff: TimeOff[];
  appointments: Appointment[];
  selectedId: string | null;
  onSelect: (item: Appointment) => void;
}) {
  return <div className="grid grid-cols-[220px_repeat(7,minmax(185px,1fr))] border-b border-[var(--color-ink-line)] last:border-0">
    <div className="p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-brass)]/10 text-[var(--color-brass)]"><UserRound className="h-4 w-4" /></span><div><strong className="text-sm">{barber.display_name}</strong><p className="mt-1 text-[9px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{pretty(barber.availability_status)}{barber.accepting_walk_ins ? " · Walk-ins" : ""}</p></div></div></div>
    {days.map((day) => {
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
      const daySchedules = schedules.filter((schedule) => schedule.barber_profile_id === barber.id && schedule.weekday === weekday && (!schedule.effective_from || schedule.effective_from <= day) && (!schedule.effective_to || schedule.effective_to >= day));
      const dayStart = zonedDateTimeToUtc(day, "00:00:00", SHOP_TIME_ZONE).getTime();
      const dayEnd = zonedDateTimeToUtc(shiftDate(day, 1), "00:00:00", SHOP_TIME_ZONE).getTime();
      const dayOff = timeOff.filter((block) => block.barber_profile_id === barber.id && new Date(block.starts_at).getTime() < dayEnd && new Date(block.ends_at).getTime() > dayStart);
      const dayAppointments = appointments.filter((item) => appointmentDate(item.starts_at) === day);
      return <div key={day} className={`min-h-[190px] border-l border-[var(--color-ink-line)] p-2.5 ${day === localDate() ? "bg-[var(--color-brass)]/[.025]" : ""}`}>
        <div className="mb-2 flex flex-wrap gap-1">
          {daySchedules.length ? daySchedules.map((schedule) => <span key={schedule.id} className="rounded-full border border-emerald-400/20 px-2 py-1 text-[8px] uppercase tracking-[.1em] text-emerald-300">Available {scheduleTime(schedule.starts_at)}–{scheduleTime(schedule.ends_at)}</span>) : <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-[.1em] text-[var(--color-bone-muted)]">Not scheduled</span>}
          {dayOff.map((block) => <span key={block.id} className="rounded-full border border-red-400/20 px-2 py-1 text-[8px] uppercase tracking-[.1em] text-red-200">Unavailable {time(block.starts_at)}–{time(block.ends_at)}</span>)}
        </div>
        <div className="grid gap-2">
          {dayAppointments.map((item) => <button type="button" key={item.id} onClick={() => onSelect(item)} title={`Open complete appointment details for ${item.client_name_snapshot}`} className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${selectedId === item.id ? "border-[var(--color-brass)] bg-[var(--color-brass)]/10" : "border-white/[.08] bg-white/[.025] hover:border-[var(--color-brass)]/40"}`}>
            <div className="flex items-center justify-between gap-2"><strong className="text-xs">{time(item.starts_at)}</strong><span className="text-[8px] uppercase tracking-[.1em] text-emerald-300">Paid {money(item.payment.paidPrincipalCents)}</span></div>
            <p className="mt-2 truncate text-sm font-medium">{item.client_name_snapshot}</p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--color-bone-muted)]">{item.service_name_snapshot}</p>
            <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[8px] uppercase tracking-[.1em] text-[var(--color-brass)]">{pretty(item.status)}</span><span className="text-[8px] uppercase tracking-[.1em] text-[var(--color-bone-muted)]">{item.clientInsights.type === "new" ? "New" : item.clientInsights.type.startsWith("returning") ? "Returning" : "History ?"}</span></div>
          </button>)}
        </div>
      </div>;
    })}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-5"><p className="text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">{label}</p><p className="font-display mt-2 text-3xl">{value}</p></article>;
}

function DetailCard({ icon, label, value, subvalue }: { icon: React.ReactNode; label: string; value: string; subvalue?: string }) {
  return <div className="rounded-xl border border-[var(--color-ink-line)] bg-white/[.015] p-4"><div className="flex items-center gap-2 text-[var(--color-brass)]">{icon}<span className="text-[8px] uppercase tracking-[.14em]">{label}</span></div><p className="mt-3 text-sm font-medium">{value}</p>{subvalue ? <p className="mt-1 text-xs leading-5 text-[var(--color-bone-muted)]">{subvalue}</p> : null}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--color-ink-line)] p-3"><dt className="text-[8px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{label}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>;
}

function NoteCard({ label, text, meta }: { label: string; text: string; meta?: string }) {
  return <article className="rounded-xl border border-[var(--color-ink-line)] bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><span className="text-[8px] uppercase tracking-[.12em] text-[var(--color-brass)]">{label}</span>{meta ? <span className="text-[9px] text-[var(--color-bone-muted)]">{meta}</span> : null}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-bone-muted)]">{text}</p></article>;
}

function Health({ label, value }: { label: string; value: string | null }) {
  const normalized = String(value ?? "unknown").toLowerCase();
  const healthy = ["sent", "delivered", "synced", "success", "completed", "processed"].includes(normalized);
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-ink-line)] p-3"><span className="text-xs text-[var(--color-bone-muted)]">{label}</span><span className={`text-[9px] uppercase tracking-[.12em] ${healthy ? "text-emerald-300" : "text-[var(--color-brass)]"}`}>{pretty(value)}</span></div>;
}

function Action({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="min-h-10 rounded-full border border-[var(--color-ink-line)] px-3 text-[9px] uppercase tracking-[.12em] transition hover:border-[var(--color-brass)]/50 disabled:opacity-35">{label}</button>;
}
