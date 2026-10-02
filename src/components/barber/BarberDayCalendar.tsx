"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { ScheduleBoard, ScheduleLegend, type BoardAppointment, type BoardColumn } from "@/components/schedule/ScheduleBoard";
import type { CalendarFacts } from "@/lib/booking/calendar-model";
import { FINISHABLE_STATUSES } from "@/lib/booking/rules";
import type { ScheduleRow } from "@/lib/booking/slots";
import { addDays, dateInZone } from "@/lib/booking/timezone";
import { getBrowserSupabase } from "@/lib/supabase/client";

const SHOP_TIME_ZONE = "America/New_York";
const FALLBACK_REFRESH_MS = 20_000;

type Payload = {
  ok: boolean;
  generatedAt: string;
  timezone: string;
  barber: { id: string; name: string };
  startDate: string;
  days: string[];
  appointments: BoardAppointment[];
  holds: BoardAppointment[];
  schedules: ScheduleRow[];
  timeOff: CalendarFacts["timeOff"];
  breaks: CalendarFacts["breaks"];
  businessHours: CalendarFacts["businessHours"];
  holidayHours: CalendarFacts["holidayHours"];
  rules: { bufferMinutes: number; earlyFinishGuardMinutes: number };
};

type FinishResponse = { ok?: boolean; message?: string; duplicate?: boolean; availableAgainAt?: string };

function clock(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00Z`));
}

function today() {
  return dateInZone(new Date(), SHOP_TIME_ZONE);
}

/**
 * The barber's own timeline. It is drawn from the same records and the same
 * rules as the Admin Portal calendar and the public booking page, and lets the
 * barber finish an appointment so unused time reopens for booking.
 */
export function BarberDayCalendar({ days = 1 }: { days?: 1 | 7 }) {
  const [date, setDate] = useState(() => today());
  const [payload, setPayload] = useState<Payload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    const response = await fetch(`/api/barber/calendar?start=${encodeURIComponent(date)}&days=${days}`, { cache: "no-store" }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as Payload | null : null;
    if (requestId !== requestSequence.current) return;
    if (!response?.ok || !result?.ok) {
      setNotice({ tone: "error", text: "Your calendar could not be loaded. Please refresh and try again." });
      return;
    }
    setPayload(result);
  }, [date, days]);

  useEffect(() => {
    let disposed = false;
    const refresh = () => { if (!disposed) void load(); };
    const initial = window.setTimeout(refresh, 0);
    const fallback = window.setInterval(refresh, FALLBACK_REFRESH_MS);
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    const supabase = getBrowserSupabase();
    const channel = supabase
      ? supabase.channel("booking-availability:northfield", { config: { private: false } }).on("broadcast", { event: "availability_changed" }, refresh).subscribe()
      : null;
    return () => {
      disposed = true;
      window.clearTimeout(initial);
      window.clearInterval(fallback);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [load]);

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

  const columns = useMemo<BoardColumn[]>(() => {
    if (!payload) return [];
    return payload.days.map((day) => ({ key: `${payload.barber.id}:${day}`, barberId: payload.barber.id, date: day, title: dayLabel(day), subtitle: day === today() ? "Today" : undefined }));
  }, [payload]);

  const boardAppointments = useMemo(() => (payload ? [...payload.appointments, ...payload.holds] : []), [payload]);
  const selected = useMemo(() => payload?.appointments.find((item) => item.id === selectedId) ?? null, [payload, selectedId]);

  async function finish() {
    if (!selected || busy) return;
    setBusy(true);
    setNotice(null);
    const response = await fetch("/api/barber/calendar", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appointmentId: selected.id, action: "finish" }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as FinishResponse | null : null;
    if (result?.ok) {
      setNotice({ tone: "success", text: result.duplicate ? "This appointment was already finished." : `Finished.${result.availableAgainAt && payload ? ` Your chair is open again from ${clock(result.availableAgainAt, payload.timezone)}.` : ""}` });
    } else {
      setNotice({ tone: "error", text: result?.message ?? "The appointment could not be finished. Please try again." });
    }
    await load();
    setBusy(false);
  }

  if (!payload || !facts) return <div className="portal-card text-sm text-[var(--color-bone-muted)]">{notice?.text ?? "Loading your calendar…"}</div>;

  const finishable = selected ? (FINISHABLE_STATUSES as readonly string[]).includes(selected.status) : false;
  const tooEarly = selected ? new Date(selected.starts_at).getTime() - facts.nowMs > payload.rules.earlyFinishGuardMinutes * 60_000 : false;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2">
          <button type="button" onClick={() => setDate(addDays(date, -days))} className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label={days === 1 ? "Previous day" : "Previous week"}><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setDate(today())} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] uppercase tracking-[.14em]">Today</button>
          <button type="button" onClick={() => setDate(addDays(date, days))} className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label={days === 1 ? "Next day" : "Next week"}><ChevronRight className="h-4 w-4" /></button>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 text-[10px] uppercase tracking-[.14em]"><RefreshCw className="h-4 w-4" />Refresh</button>
        </div>
        <ScheduleLegend bufferMinutes={payload.rules.bufferMinutes} />
      </div>

      {notice ? <div role={notice.tone === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${notice.tone === "error" ? "border-red-400/40 bg-red-500/10 text-red-100" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"}`}>{notice.text}</div> : null}

      {selected ? (
        <section className="rounded-2xl border border-[var(--color-brass)]/25 bg-[var(--color-brass)]/[.03] p-5" aria-live="polite">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]">{clock(selected.starts_at, payload.timezone)} – {clock(selected.ends_at, payload.timezone)} · {String(selected.status).replaceAll("_", " ")}</p>
              <h2 className="font-display mt-1 text-2xl">{selected.client_name_snapshot ?? "Client"}</h2>
              <p className="mt-1 text-sm text-[var(--color-bone-muted)]">{selected.service_name_snapshot}{selected.booking_kind === "family" && selected.party_size ? ` · ${selected.party_size} people` : ""}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={busy || !finishable || tooEarly} onClick={() => void finish()} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 text-[10px] uppercase tracking-[.16em] text-[var(--color-ink)] disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />{busy ? "Finishing…" : "Finish"}</button>
              <button type="button" onClick={() => setSelectedId(null)} className="min-h-12 rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] uppercase tracking-[.14em]">Close</button>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--color-bone-muted)]">
            {selected.status === "completed"
              ? `Finished${selected.completed_at ? ` at ${clock(selected.completed_at, payload.timezone)}` : ""}.`
              : tooEarly
                ? "This appointment has not started yet, so it cannot be finished."
                : `Finish records the real end time. If you finish early, the rest of the reserved time reopens for booking after the ${payload.rules.bufferMinutes}-minute gap.`}
          </p>
        </section>
      ) : (
        <p className="text-xs text-[var(--color-bone-muted)]">Select an appointment to finish it. To block time, use Profile &amp; availability.</p>
      )}

      <ScheduleBoard columns={columns} facts={facts} appointments={boardAppointments} selectedId={selectedId} onSelect={(item) => { if (payload.appointments.some((row) => row.id === item.id)) setSelectedId(item.id); }} emptyLabel="Not working" />
    </div>
  );
}
