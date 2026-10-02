"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { ScheduleBoard, ScheduleLegend, type BoardAppointment, type BoardColumn, type BoardDrop } from "@/components/schedule/ScheduleBoard";
import type { CalendarFacts } from "@/lib/booking/calendar-model";
import { FINISHABLE_STATUSES, PAID_UNPLACED_STATUS, RESCHEDULABLE_STATUSES, TIMELINE_STATUSES as TIMELINE_STATUS_LIST, isReschedulable } from "@/lib/booking/rules";
import { rejectionMessage, type ScheduleRow } from "@/lib/booking/slots";
import { getBrowserSupabase } from "@/lib/supabase/client";

const SHOP_TIME_ZONE = "America/New_York";
const FALLBACK_REFRESH_MS = 20_000;
const REALTIME_DEBOUNCE_MS = 400;
/** Statuses that sit on the timeline. Everything else is listed below it. */
const TIMELINE_STATUSES = new Set<string>(TIMELINE_STATUS_LIST);

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

type ServiceItem = {
  sequence: number;
  role: string | null;
  label: string | null;
  serviceName: string | null;
  priceCents: number;
  durationMinutes: number;
  offsetMinutes: number;
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
  booking_kind: string | null;
  party_size: number | null;
  completed_at: string | null;
  hold_expires_at: string | null;
  reschedule_count: number | null;
  serviceItems: ServiceItem[];
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

type Hold = {
  id: string;
  public_reference: string | null;
  barber_profile_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  deposit_status: string | null;
  hold_expires_at: string | null;
  service_name_snapshot: string | null;
  client_name_snapshot: string | null;
  booking_kind: string | null;
  party_size: number;
};

type Barber = {
  id: string;
  staff_user_id: string | null;
  display_name: string;
  availability_status: string;
  accepting_walk_ins: boolean;
};

type TimeBlock = {
  id: string;
  barber_profile_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  status: string;
  availability_kind?: string | null;
};

type CalendarPayload = {
  ok: boolean;
  generatedAt: string;
  timezone: string;
  location: string;
  startDate: string;
  endDate: string;
  days: string[];
  barbers: Barber[];
  appointments: Appointment[];
  schedules: ScheduleRow[];
  timeOff: TimeBlock[];
  breaks: TimeBlock[];
  holds: Hold[];
  businessHours: CalendarFacts["businessHours"];
  holidayHours: CalendarFacts["holidayHours"];
  rules: { source: string; bufferMinutes: number; snapMinutes: number; earlyFinishGuardMinutes: number };
  message?: string;
};

type PatchResponse = { ok?: boolean; message?: string; status?: string; code?: string; changed?: boolean; duplicate?: boolean; clientNotified?: boolean; availableAgainAt?: string };
type Notice = { tone: "info" | "success" | "error"; text: string };
type View = "day" | "week";

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

function longDayLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00Z`));
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function pretty(value: string | null | undefined) {
  return String(value ?? "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function scheduledMinutes(appointment: { starts_at: string; ends_at: string }) {
  return Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000);
}

export function AdminAppointmentsWorkspace() {
  const [view, setView] = useState<View>("day");
  const [date, setDate] = useState(() => localDate());
  const [payload, setPayload] = useState<CalendarPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [barberFilter, setBarberFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingMove, setPendingMove] = useState<BoardDrop | null>(null);
  const [savingMoveId, setSavingMoveId] = useState<string | null>(null);
  const [paidHoldId, setPaidHoldId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const requestSequence = useRef(0);
  const refreshTimer = useRef<number | null>(null);

  const days = view === "day" ? 1 : 7;

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    const response = await fetch(`/api/admin/calendar?start=${encodeURIComponent(date)}&days=${days}`, { cache: "no-store" }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as CalendarPayload | null : null;
    // A slower, older response must never overwrite a newer one.
    if (requestId !== requestSequence.current) return;
    if (!response?.ok || !result?.ok) {
      setNotice({ tone: "error", text: "The appointment calendar could not be loaded. Please refresh and try again." });
      return;
    }
    setPayload(result);
  }, [date, days]);

  // The newest loader is kept in a ref so the timers and the realtime channel
  // are set up once and never torn down when the date or view changes.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
    const initial = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  useEffect(() => {
    let disposed = false;
    const refresh = () => { if (!disposed) void loadRef.current(); };
    const fallback = window.setInterval(refresh, FALLBACK_REFRESH_MS);
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);

    // The database announces every availability change on this channel. The
    // message carries no personal data; it only tells the calendar to reload.
    const supabase = getBrowserSupabase();
    const channel = supabase
      ? supabase
          .channel("booking-availability:northfield", { config: { private: false } })
          .on("broadcast", { event: "availability_changed" }, () => {
            if (disposed) return;
            if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
            refreshTimer.current = window.setTimeout(() => { refreshTimer.current = null; refresh(); }, REALTIME_DEBOUNCE_MS);
          })
          .subscribe((status) => {
            if (disposed) return;
            setLive(status === "SUBSCRIBED");
          })
      : null;

    return () => {
      disposed = true;
      window.clearInterval(fallback);
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, []);

  const selected = useMemo(() => payload?.appointments.find((item) => item.id === selectedId) ?? null, [payload, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selectedId]);

  const facts = useMemo<CalendarFacts | null>(() => {
    if (!payload) return null;
    return {
      timezone: payload.timezone || SHOP_TIME_ZONE,
      bufferMinutes: payload.rules.bufferMinutes,
      nowMs: Date.parse(payload.generatedAt),
      schedules: payload.schedules,
      businessHours: payload.businessHours,
      holidayHours: payload.holidayHours,
      timeOff: payload.timeOff,
      breaks: payload.breaks,
      appointments: [...payload.appointments, ...payload.holds],
    };
  }, [payload]);

  const dimmed = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = new Set<string>();
    if (!query || !payload) return result;
    for (const item of payload.appointments) {
      const matches = [
        item.client_name_snapshot,
        item.client_email_snapshot,
        item.client_phone_snapshot,
        item.public_reference,
        item.service_name_snapshot,
        item.barber_name_snapshot,
        clientTypeLabel(item.clientInsights.type),
      ].some((value) => String(value ?? "").toLowerCase().includes(query));
      if (!matches) result.add(item.id);
    }
    return result;
  }, [payload, search]);

  const weekBarber = useMemo(() => payload?.barbers.find((barber) => barber.id === barberFilter) ?? payload?.barbers[0] ?? null, [barberFilter, payload]);

  const columns = useMemo<BoardColumn[]>(() => {
    if (!payload) return [];
    if (view === "day") {
      return (barberFilter ? payload.barbers.filter((barber) => barber.id === barberFilter) : payload.barbers).map((barber) => ({
        key: `${barber.id}:${date}`,
        barberId: barber.id,
        date,
        title: barber.display_name,
        subtitle: `${pretty(barber.availability_status)}${barber.accepting_walk_ins ? " · Walk-ins" : ""}`,
      }));
    }
    if (!weekBarber) return [];
    return payload.days.map((day) => ({ key: `${weekBarber.id}:${day}`, barberId: weekBarber.id, date: day, title: dayLabel(day), subtitle: day === localDate() ? "Today" : weekBarber.display_name }));
  }, [barberFilter, date, payload, view, weekBarber]);

  const boardAppointments = useMemo<BoardAppointment[]>(() => {
    if (!payload) return [];
    return [...payload.appointments.filter((item) => TIMELINE_STATUSES.has(item.status)), ...payload.holds];
  }, [payload]);

  const offTimeline = useMemo(() => {
    if (!payload) return [];
    const visibleBarbers = new Set(columns.map((column) => column.barberId));
    return payload.appointments.filter((item) => !TIMELINE_STATUSES.has(item.status) && visibleBarbers.has(item.barber_profile_id) && !dimmed.has(item.id));
  }, [columns, dimmed, payload]);

  async function patch(appointmentId: string, action: string, extra: Record<string, unknown> = {}) {
    const response = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appointmentId, action, reason: `Calendar: ${action.replaceAll("_", " ")}`, ...extra }),
    }).catch(() => null);
    return response ? await response.json().catch(() => null) as PatchResponse | null : null;
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!selected || busy) return;
    setBusy(action);
    setNotice(null);
    const result = await patch(selected.id, action, extra);
    if (result?.ok) {
      const text = action === "complete"
        ? result.duplicate ? "This appointment was already finished." : `Finished.${result.availableAgainAt ? ` ${selected.barber_name_snapshot} is open again from ${time(result.availableAgainAt)}.` : ""}`
        : action === "reschedule" || action === "reassign"
          ? result.changed === false ? "The appointment is already at that time." : `Appointment moved.${result.clientNotified ? " The client has been notified." : ""}`
          : result.message ?? "Appointment updated.";
      setNotice({ tone: "success", text });
      await load();
    } else {
      setNotice({ tone: "error", text: result?.message ?? "The appointment could not be updated. Please try again." });
    }
    setBusy(null);
    return Boolean(result?.ok);
  }

  // One barber is shown as seven days side by side, so an appointment can be
  // dragged to another day. All barbers are shown side by side for one day.
  function chooseBarber(barberId: string) {
    setBarberFilter(barberId);
    setView(barberId ? "week" : "day");
  }

  function handleDrop(drop: BoardDrop) {
    if (!drop.result.ok) {
      // Nothing was sent to the server and the card stays where it was.
      setNotice({ tone: "error", text: `Not moved. ${rejectionMessage(drop.result.reason)}` });
      return;
    }
    setNotice(null);
    setPendingMove(drop);
  }

  async function confirmMove() {
    if (!pendingMove || savingMoveId) return;
    const move = pendingMove;
    setPendingMove(null);
    setSavingMoveId(move.appointment.id);
    // The card is not moved here. It moves only when the reload shows the
    // database has committed the new time.
    const result = await patch(move.appointment.id, "reschedule", {
      startsAt: new Date(move.startMs).toISOString(),
      ...(move.barberId !== move.appointment.barber_profile_id ? { barberProfileId: move.barberId } : {}),
      reason: "Calendar: moved by drag and drop",
    });
    if (result?.ok) {
      setNotice({ tone: "success", text: `Appointment moved to ${dateTime(new Date(move.startMs).toISOString())}.${result.clientNotified ? " The client has been notified." : ""}` });
    } else {
      setNotice({ tone: "error", text: `Not moved. ${result?.message ?? "The change could not be saved. Please try again."}` });
    }
    await load();
    setSavingMoveId(null);
  }

  async function confirmPaidHold() {
    if (!paidHoldId || busy) return;
    const id = paidHoldId;
    setPaidHoldId(null);
    setBusy("confirm");
    const result = await patch(id, "confirm");
    setNotice(result?.ok ? { tone: "success", text: "Booking confirmed." } : { tone: "error", text: result?.message ?? "The booking could not be confirmed. Please try again." });
    await load();
    setBusy(null);
  }

  if (!payload || !facts) return <div className="rounded-2xl border border-[var(--color-ink-line)] p-8 text-sm text-[var(--color-bone-muted)]">{notice?.text ?? "Loading the live appointment calendar…"}</div>;

  const step = view === "day" ? 1 : 7;
  const onTimeline = payload.appointments.filter((item) => TIMELINE_STATUSES.has(item.status));
  const paidHold = paidHoldId ? payload.holds.find((item) => item.id === paidHoldId) ?? null : null;
  const moveBarberName = pendingMove ? payload.barbers.find((barber) => barber.id === pendingMove.barberId)?.display_name ?? "the selected barber" : "";

  return <div className="grid gap-6">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[.24em] text-[var(--color-brass)]">Live schedule · {payload.location}</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">Appointments Calendar</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">Each barber&apos;s working hours, open time, appointments, checkouts in progress and unavailable time, exactly as the booking page sees them. Choose a barber to see seven days side by side, then drag an appointment to another time or another day. Open it for full details.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/book" target="_blank" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] uppercase tracking-[.14em] text-black"><CalendarDays className="h-4 w-4" />New booking</Link>
        <Link href="/admin/payments" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] uppercase tracking-[.14em]"><WalletCards className="h-4 w-4" />Payments</Link>
        <Link href="/admin/time-off" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] uppercase tracking-[.14em]">Availability</Link>
      </div>
    </header>

    <section className="grid gap-3 md:grid-cols-4">
      <Metric label={view === "day" ? "Appointments this day" : "Appointments this week"} value={String(onTimeline.length)} />
      <Metric label="Confirmed" value={String(onTimeline.filter((item) => item.status === "confirmed").length)} />
      <Metric label="In service" value={String(onTimeline.filter((item) => item.status === "in_service").length)} />
      <Metric label="Checkouts in progress" value={String(payload.holds.length)} />
    </section>

    <section className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-4 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[auto_auto_minmax(220px,1fr)_220px_auto] xl:items-end">
        <div className="flex gap-2">
          <button type="button" onClick={() => setDate(shiftDate(date, -step))} className="grid h-12 w-12 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label={view === "day" ? "Previous day" : "Previous week"}><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setDate(localDate())} className="min-h-12 rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] uppercase tracking-[.14em]">Today</button>
          <button type="button" onClick={() => setDate(shiftDate(date, step))} className="grid h-12 w-12 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label={view === "day" ? "Next day" : "Next week"}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-2">
          <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Date<input type="date" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-3 text-sm normal-case tracking-normal" /></label>
          <div className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">View
            <div className="flex min-h-12 overflow-hidden rounded-xl border border-[var(--color-ink-line)]" role="group" aria-label="Calendar view">
              {(["day", "week"] as const).map((option) => <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={`px-4 text-[10px] uppercase tracking-[.14em] ${view === option ? "bg-[var(--color-brass)] text-black" : "text-[var(--color-bone)]"}`}>{option}</button>)}
            </div>
          </div>
        </div>
        <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Search<span className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] pl-10 pr-4 text-sm normal-case tracking-normal" placeholder="Client, reference, service or barber" /></span></label>
        <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Barber<select value={view === "week" ? weekBarber?.id ?? "" : barberFilter} onChange={(event) => chooseBarber(event.target.value)} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal"><option value="">{view === "day" ? "All barbers" : "All barbers (one day)"}</option>{payload.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.display_name}</option>)}</select></label>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] uppercase tracking-[.14em]"><RefreshCw className="h-4 w-4" />Refresh</button>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-ink-line)] pt-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm"><strong className="font-medium">{view === "day" ? longDayLabel(date) : `${dayLabel(payload.days[0] ?? date)} to ${dayLabel(payload.days.at(-1) ?? date)}${weekBarber ? ` · ${weekBarber.display_name}` : ""}`}</strong><span className="ml-3 text-[10px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{live ? "Live updates on" : "Refreshing every 20 seconds"}</span><span className="mt-1 block text-xs text-[var(--color-bone-muted)]">{view === "day" ? "Drag a card to another time or another barber. Hold it on the left or right edge to change the day." : "Drag a card to another time or another day. Hold it on the left or right edge to see earlier or later days."}</span></p>
        <ScheduleLegend bufferMinutes={payload.rules.bufferMinutes} />
      </div>
    </section>

    {notice ? <div role={notice.tone === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${notice.tone === "error" ? "border-red-400/40 bg-red-500/10 text-red-100" : notice.tone === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-[var(--color-brass)]/25 bg-[var(--color-brass)]/5"}`}>{notice.text}</div> : null}

    <ScheduleBoard
      columns={columns}
      facts={facts}
      appointments={boardAppointments}
      selectedId={selectedId}
      pendingId={savingMoveId}
      dimmed={dimmed}
      snapMinutes={payload.rules.snapMinutes}
      onSelect={(item) => { if (payload.appointments.some((row) => row.id === item.id)) setSelectedId(item.id); }}
      onPaidHoldSelect={(item) => setPaidHoldId(item.id)}
      movable={(item) => !savingMoveId && (RESCHEDULABLE_STATUSES as readonly string[]).includes(item.status)}
      onDrop={handleDrop}
      onPage={(direction) => setDate((current) => shiftDate(current, direction * step))}
      pageLabels={view === "day" ? { previous: "Previous day", next: "Next day" } : { previous: "Earlier days", next: "Later days" }}
    />

    {offTimeline.length ? <section className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-4 sm:p-5">
      <p className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]">Not on the calendar</p>
      <p className="mt-1 text-xs text-[var(--color-bone-muted)]">Cancelled, no-show and superseded appointments do not hold any time. A booking marked &quot;Paid, needs a new time&quot; was paid after its checkout hold ended and its time had been taken: open it and move it to an open time, or refund it in Square.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {offTimeline.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="rounded-xl border border-white/[.08] p-3 text-left hover:border-[var(--color-brass)]/40">
          <span className="flex items-center justify-between gap-2"><strong className="text-xs">{dateTime(item.starts_at)}</strong><span className={`text-[8px] uppercase tracking-[.1em] ${item.status === PAID_UNPLACED_STATUS ? "text-amber-300" : "text-[var(--color-bone-muted)]"}`}>{item.status === PAID_UNPLACED_STATUS ? "Paid, needs a new time" : pretty(item.status)}</span></span>
          <span className="mt-1 block truncate text-sm">{item.client_name_snapshot}</span>
          <span className="block truncate text-[10px] text-[var(--color-bone-muted)]">{item.service_name_snapshot} · {item.barber_name_snapshot}</span>
        </button>)}
      </div>
    </section> : null}

    {pendingMove ? <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirm appointment move">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-brass)]/30 bg-[#0b0b0b] p-6 shadow-2xl">
        <p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Move appointment</p>
        <h2 className="font-display mt-2 text-2xl">{pendingMove.appointment.client_name_snapshot}</h2>
        <p className="mt-1 text-sm text-[var(--color-bone-muted)]">{pendingMove.appointment.service_name_snapshot} · {scheduledMinutes(pendingMove.appointment)} minutes</p>
        <dl className="mt-5 grid gap-3">
          <Info label="From" value={`${dateTime(pendingMove.appointment.starts_at)} · ${payload.barbers.find((barber) => barber.id === pendingMove.appointment.barber_profile_id)?.display_name ?? "Barber"}`} />
          <Info label="To" value={`${dateTime(new Date(pendingMove.startMs).toISOString())} · ${moveBarberName}`} />
        </dl>
        <p className="mt-4 text-xs leading-5 text-[var(--color-bone-muted)]">The client is notified once the move is saved. If the time was taken a moment ago, nothing changes and you will see why.</p>
        <div className="mt-6 flex gap-2">
          <button type="button" autoFocus onClick={() => void confirmMove()} className="min-h-11 flex-1 rounded-full bg-[var(--color-brass)] px-4 text-[10px] uppercase tracking-[.14em] text-black">Move appointment</button>
          <button type="button" onClick={() => setPendingMove(null)} className="min-h-11 flex-1 rounded-full border border-[var(--color-ink-line)] px-4 text-[10px] uppercase tracking-[.14em]">Keep as is</button>
        </div>
      </div>
    </div> : null}

    {paidHold ? <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirm paid booking">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-brass)]/30 bg-[#0b0b0b] p-6 shadow-2xl">
        <p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Payment received</p>
        <h2 className="font-display mt-2 text-2xl">{paidHold.client_name_snapshot ?? "Client"}</h2>
        <p className="mt-1 text-sm text-[var(--color-bone-muted)]">{paidHold.service_name_snapshot ?? "Service"} · {dateTime(paidHold.starts_at)}{paidHold.public_reference ? ` · ${paidHold.public_reference}` : ""}</p>
        <p className="mt-4 text-xs leading-5 text-[var(--color-bone-muted)]">A payment was received for this checkout but the booking was not confirmed automatically. Confirming checks the payment again and only succeeds when the full service amount is paid.</p>
        <div className="mt-6 flex gap-2">
          <button type="button" autoFocus onClick={() => void confirmPaidHold()} className="min-h-11 flex-1 rounded-full bg-[var(--color-brass)] px-4 text-[10px] uppercase tracking-[.14em] text-black">Confirm booking</button>
          <button type="button" onClick={() => setPaidHoldId(null)} className="min-h-11 flex-1 rounded-full border border-[var(--color-ink-line)] px-4 text-[10px] uppercase tracking-[.14em]">Close</button>
        </div>
      </div>
    </div> : null}

    {selected ? <AppointmentInspector
      key={selected.id}
      appointment={selected}
      barbers={payload.barbers}
      busy={busy}
      bufferMinutes={payload.rules.bufferMinutes}
      onClose={() => setSelectedId(null)}
      onAct={act}
    /> : null}
  </div>;
}

function AppointmentInspector({ appointment, barbers, busy, bufferMinutes, onClose, onAct }: {
  appointment: Appointment;
  barbers: Barber[];
  busy: string | null;
  bufferMinutes: number;
  onClose: () => void;
  onAct: (action: string, extra?: Record<string, unknown>) => Promise<boolean | undefined>;
}) {
  const [moveBarber, setMoveBarber] = useState(appointment.barber_profile_id);
  const [moveDate, setMoveDate] = useState(() => localDate(new Date(appointment.starts_at)));
  const [moveStart, setMoveStart] = useState("");
  const [openTimes, setOpenTimes] = useState<{ key: string; starts: string[]; error: string | null } | null>(null);
  const [internalNote, setInternalNote] = useState("");
  const movable = isReschedulable(appointment.status, appointment.deposit_status);
  const unplaced = appointment.status === PAID_UNPLACED_STATUS;
  const finishable = (FINISHABLE_STATUSES as readonly string[]).includes(appointment.status);
  const handover = ["checked_in", "assigned", "in_service"].includes(appointment.status);
  const slotKey = `${appointment.id}:${moveBarber}:${moveDate}:${appointment.starts_at}`;
  const slotsLoading = movable && openTimes?.key !== slotKey;

  useEffect(() => {
    if (!movable || !moveDate) return;
    let disposed = false;
    const query = new URLSearchParams({ appointmentId: appointment.id, date: moveDate, barberProfileId: moveBarber });
    fetch(`/api/admin/appointments/slots?${query.toString()}`, { cache: "no-store" })
      .then((response) => response.json().catch(() => null))
      .then((result: { ok?: boolean; starts?: string[]; message?: string } | null) => {
        if (disposed) return;
        setOpenTimes({ key: slotKey, starts: result?.ok ? result.starts ?? [] : [], error: result?.ok ? null : result?.message ?? "Open times could not be loaded." });
      })
      .catch(() => {
        if (!disposed) setOpenTimes({ key: slotKey, starts: [], error: "Open times could not be loaded." });
      });
    return () => { disposed = true; };
  }, [appointment.id, movable, moveBarber, moveDate, slotKey]);

  const currentStart = new Date(appointment.starts_at).toISOString();
  const minutes = scheduledMinutes(appointment);
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
              {paidInFull
                ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 px-3 py-1.5 text-[9px] uppercase tracking-[.12em] text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" />Paid in full</span>
                : <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 px-3 py-1.5 text-[9px] uppercase tracking-[.12em] text-amber-200">{appointment.deposit_status === "not_required" ? "No payment recorded" : `Payment ${pretty(appointment.deposit_status).toLowerCase()}`}</span>}
              <span className="rounded-full border border-[var(--color-brass)]/25 px-3 py-1.5 text-[9px] uppercase tracking-[.12em] text-[var(--color-brass)]">{clientTypeLabel(client.type)}</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{appointment.status === PAID_UNPLACED_STATUS ? "Paid, needs a new time" : pretty(appointment.status)}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-ink-line)] hover:border-[var(--color-brass)]/50" aria-label="Close appointment details"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-7">
        <section className="grid gap-3 sm:grid-cols-2">
          <DetailCard icon={<CalendarDays className="h-4 w-4" />} label="Appointment" value={dateTime(appointment.starts_at)} subvalue={`${minutes} minutes · ends ${time(appointment.ends_at)}${appointment.completed_at ? ` · finished ${time(appointment.completed_at)}` : ""}`} />
          <DetailCard icon={<UserRound className="h-4 w-4" />} label="Barber" value={appointment.barber_name_snapshot} subvalue={pretty(appointment.status)} />
          <DetailCard icon={<Scissors className="h-4 w-4" />} label="Service" value={appointment.service_name_snapshot} subvalue={appointment.booking_kind === "family" ? `Family booking · ${appointment.party_size ?? appointment.serviceItems.length} people` : `Add-ons: ${addonSummary(appointment.addon_snapshot)}`} />
          <DetailCard icon={<ReceiptText className="h-4 w-4" />} label="Service price" value={money(appointment.service_price_snapshot_cents)} subvalue={`Reference ${appointment.public_reference}`} />
        </section>

        {appointment.serviceItems.length ? <section className="rounded-2xl border border-[var(--color-brass)]/20 bg-[var(--color-brass)]/[.025] p-5">
          <div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-[var(--color-brass)]" /><p className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]">Family booking · one appointment, {appointment.serviceItems.length} services in a row</p></div>
          <ol className="mt-4 grid gap-2">
            {appointment.serviceItems.map((item) => {
              const itemStart = new Date(new Date(appointment.starts_at).getTime() + item.offsetMinutes * 60_000).toISOString();
              const itemEnd = new Date(new Date(itemStart).getTime() + item.durationMinutes * 60_000).toISOString();
              return <li key={item.sequence} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-ink-line)] p-3">
                <span><strong className="text-sm">{item.label ?? pretty(item.role)}</strong><span className="mt-0.5 block text-xs text-[var(--color-bone-muted)]">{item.serviceName} · {item.durationMinutes} min</span></span>
                <span className="text-right text-xs tabular-nums"><span className="block">{time(itemStart)} – {time(itemEnd)}</span><span className="block text-[var(--color-bone-muted)]">{money(item.priceCents)}</span></span>
              </li>;
            })}
          </ol>
          <p className="mt-3 text-xs leading-5 text-[var(--color-bone-muted)]">Total {minutes} minutes including the {bufferMinutes}-minute changeover between family members, {money(appointment.service_price_snapshot_cents)}. The whole booking moves together.</p>
        </section> : null}

        <section className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.025] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[9px] uppercase tracking-[.16em] text-emerald-300">Payment record</p><h3 className="font-display mt-2 text-2xl">{paidInFull ? "Paid appointment" : "No payment recorded for this appointment"}</h3></div>
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
            <Action label={busy === "complete" ? "Finishing…" : "Finish"} disabled={busy !== null || !finishable} onClick={() => void onAct("complete")} />
            <Action label="No show" disabled={busy !== null || !["confirmed", "checked_in", "assigned"].includes(appointment.status)} onClick={() => void onAct("no_show")} />
            <Action label="Cancel" disabled={busy !== null || ["completed", "cancelled_by_client", "cancelled_by_business", "no_show"].includes(appointment.status)} onClick={() => void onAct("cancel")} />
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--color-bone-muted)]">{appointment.status === "completed" ? `Finished${appointment.completed_at ? ` at ${time(appointment.completed_at)}` : ""}. Any unused time was reopened after the ${bufferMinutes}-minute gap.` : `Finish records the real end time. If the service ends early, the rest of the reserved time reopens for booking after the ${bufferMinutes}-minute gap.`}</p>

          {movable ? <div className="mt-5 rounded-xl border border-[var(--color-ink-line)] p-4">
            <p className="text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Move appointment</p>
            {unplaced ? <p className="mt-2 text-xs leading-5 text-amber-200">This booking is paid but holds no time: the payment arrived after the checkout hold ended and the original time had been taken. Choose an open time to confirm it, or refund the payment in Square.</p> : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Barber<select value={moveBarber} onChange={(event) => { setMoveBarber(event.target.value); setMoveStart(""); }} className="min-h-11 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal">{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.display_name}</option>)}</select></label>
              <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Date<input type="date" value={moveDate} min={localDate()} onChange={(event) => { setMoveDate(event.target.value); setMoveStart(""); }} className="min-h-11 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal" /></label>
            </div>
            <div className="mt-3" aria-live="polite">
              {slotsLoading ? <p className="text-xs text-[var(--color-bone-muted)]">Loading open times…</p> : openTimes?.error ? <p className="text-xs text-red-200">{openTimes.error}</p> : openTimes && openTimes.starts.length === 0 ? <p className="text-xs text-[var(--color-bone-muted)]">No open time that day for a {minutes}-minute appointment.</p> : <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto" role="group" aria-label="Open times">
                {(openTimes?.starts ?? []).map((start) => <button key={start} type="button" aria-pressed={moveStart === start} disabled={!unplaced && start === currentStart && moveBarber === appointment.barber_profile_id} onClick={() => setMoveStart(start)} className={`min-h-10 rounded-full border px-3 text-xs tabular-nums disabled:opacity-35 ${moveStart === start ? "border-[var(--color-brass)] bg-[var(--color-brass)] text-black" : "border-[var(--color-ink-line)]"}`}>{time(start)}</button>)}
              </div>}
            </div>
            <button type="button" disabled={busy !== null || !moveStart} onClick={() => void onAct("reschedule", { startsAt: moveStart, ...(moveBarber !== appointment.barber_profile_id ? { barberProfileId: moveBarber } : {}) }).then((ok) => { if (ok) setMoveStart(""); })} className="mt-4 min-h-11 w-full rounded-full border border-[var(--color-brass)]/60 px-4 text-[9px] uppercase tracking-[.14em] disabled:opacity-40">{busy === "reschedule" ? "Moving…" : moveStart ? `Move to ${dateTime(moveStart)}` : "Choose an open time"}</button>
            <p className="mt-2 text-xs leading-5 text-[var(--color-bone-muted)]">Only times that fit the whole {minutes}-minute appointment are listed. The client is notified once the move is saved.</p>
          </div> : null}

          {handover ? <div className="mt-5 grid gap-2 sm:max-w-sm">
            <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Hand over to another barber<select value={moveBarber} onChange={(event) => setMoveBarber(event.target.value)} className="min-h-11 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal">{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.display_name}</option>)}</select></label>
            <button type="button" disabled={busy !== null || moveBarber === appointment.barber_profile_id} onClick={() => void onAct("reassign", { barberProfileId: moveBarber })} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] uppercase tracking-[.14em] disabled:opacity-40">Save barber</button>
          </div> : null}

          <div className="mt-5 grid gap-2">
            <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Internal note<textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} rows={3} className="rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 py-3 text-sm normal-case tracking-normal" placeholder="Private note for the shop team" /></label>
            <button type="button" disabled={busy !== null || !internalNote.trim()} onClick={() => void onAct("note", { note: internalNote.trim(), clientVisible: false }).then((ok) => { if (ok) setInternalNote(""); })} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-4 text-[9px] uppercase tracking-[.14em] disabled:opacity-40">Save note</button>
          </div>
        </section>
      </div>
    </aside>
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
