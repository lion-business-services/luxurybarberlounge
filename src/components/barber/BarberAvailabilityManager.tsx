"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Loader2, RotateCcw, XCircle } from "lucide-react";

type Schedule = {
  id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  effective_from: string;
  effective_to: string | null;
};

type Override = {
  id: string;
  source: "time_off" | "schedule";
  kind: "available" | "unavailable";
  starts_at?: string;
  ends_at?: string;
  startsAt?: string;
  endsAt?: string;
  reason?: string | null;
  status?: string;
  weekday?: number;
  effective_from?: string;
  effective_to?: string | null;
};

type Payload = {
  ok: boolean;
  timezone?: string;
  barber?: { id: string; name: string };
  defaults?: Schedule[];
  overrides?: Override[];
};

const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function localTime(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function overrideLabel(item: Override, timezone: string) {
  if (item.source === "schedule") {
    const date = item.effective_from ?? "";
    return `${date} · ${localTime(item.starts_at ?? "00:00")} – ${localTime(item.ends_at ?? "23:59")}`;
  }
  const start = new Date(item.starts_at ?? item.startsAt ?? "");
  const end = new Date(item.ends_at ?? item.endsAt ?? "");
  const date = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric" }).format(start);
  const tf = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" });
  return `${date} · ${tf.format(start)} – ${tf.format(end)}`;
}

export function BarberAvailabilityManager({ barberProfileId }: { barberProfileId?: string }) {
  const [data, setData] = useState<Payload>({ ok: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<"available" | "unavailable">("unavailable");
  const [fullDay, setFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");

  const query = useMemo(() => barberProfileId ? `?barberProfileId=${encodeURIComponent(barberProfileId)}` : "", [barberProfileId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/barber/availability${query}`, { cache: "no-store", credentials: "same-origin" });
      const result = await response.json() as Payload;
      setData(result);
      if (!response.ok) setMessage("Availability could not be loaded.");
    } catch {
      setMessage("Availability could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/barber/availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          barberProfileId,
          date,
          kind,
          fullDay,
          startTime: fullDay ? undefined : startTime,
          endTime: fullDay ? undefined : endTime,
          reason: reason || undefined,
        }),
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok) {
        setMessage(result.message ?? "Availability could not be updated.");
        return;
      }
      setMessage(kind === "unavailable" ? "Unavailable time saved. Public booking has been updated." : "Additional availability saved. Public booking has been updated.");
      setReason("");
      await load();
    } catch {
      setMessage("Availability could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Override) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/barber/availability${query}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: item.id, source: item.source }),
      });
      if (!response.ok) {
        setMessage("That override could not be removed.");
        return;
      }
      setMessage("Availability restored. Bookable times will return automatically where no appointment conflict exists.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  const defaults = data.defaults ?? [];
  const overrides = data.overrides ?? [];
  const timezone = data.timezone ?? "America/New_York";

  return (
    <div className="grid gap-6">
      <section className="portal-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Default weekly schedule</p>
            <h2 className="font-display mt-2 text-2xl">Your normal working days</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-bone-muted)]">These hours create your normal bookable windows. Date-specific changes below override them without changing the permanent schedule.</p>
          </div>
          <span className="rounded-full border border-[var(--color-ink-line)] px-3 py-1.5 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">{timezone.replace("_", " ")}</span>
        </div>
        {loading ? <p className="mt-6 text-sm text-[var(--color-bone-muted)]">Loading schedule…</p> : defaults.length ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {defaults.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--color-ink-line)] p-4">
                <strong className="text-sm">{weekday[item.weekday] ?? `Day ${item.weekday}`}</strong>
                <p className="mt-1 text-xs text-[var(--color-bone-muted)]">{localTime(item.starts_at)} – {localTime(item.ends_at)}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-5 rounded-xl border border-dashed border-[var(--color-ink-line)] p-5 text-sm text-[var(--color-bone-muted)]">No fixed weekly schedule. Add specific available dates below when you know your schedule.</p>}
      </section>

      <section className="portal-card">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-[var(--color-brass)]" />
          <div><h2 className="font-display text-2xl">Change a specific date</h2><p className="mt-1 text-sm text-[var(--color-bone-muted)]">Block a working day/time, or add availability for a date outside your normal schedule.</p></div>
        </div>
        <form onSubmit={save} className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-xs"><span>Date</span><input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-control" /></label>
            <label className="grid gap-2 text-xs"><span>Change</span><select value={kind} onChange={(e) => setKind(e.target.value as "available" | "unavailable")} className="form-control"><option value="unavailable">Unavailable</option><option value="available">Add availability</option></select></label>
          </div>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} /><span>Full day</span></label>
          {!fullDay ? <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-xs"><span>Start</span><input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-control" /></label><label className="grid gap-2 text-xs"><span>End</span><input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="form-control" /></label></div> : null}
          <label className="grid gap-2 text-xs"><span>Note (optional)</span><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={240} placeholder="School, personal appointment, extended hours…" className="form-control" /></label>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={saving || !date} type="submit" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] uppercase tracking-[.16em] text-[var(--color-ink)] disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : kind === "unavailable" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{kind === "unavailable" ? "Mark unavailable" : "Add availability"}</button>
            <p className="text-xs text-[var(--color-bone-muted)]">Changes affect public booking immediately after they are saved.</p>
          </div>
        </form>
        {message ? <p className="mt-4 rounded-lg border border-[var(--color-ink-line)] p-3 text-xs text-[var(--color-bone-muted)]">{message}</p> : null}
      </section>

      <section className="portal-card">
        <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-[var(--color-brass)]" /><div><h2 className="font-display text-2xl">Upcoming overrides</h2><p className="mt-1 text-sm text-[var(--color-bone-muted)]">Date-specific availability and unavailable periods.</p></div></div>
        {!overrides.length ? <p className="mt-5 text-sm text-[var(--color-bone-muted)]">No upcoming overrides.</p> : <ul className="mt-5 grid gap-2">{overrides.map((item) => <li key={`${item.source}-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-ink-line)] p-4"><div><p className={`text-[9px] uppercase tracking-[.16em] ${item.kind === "available" ? "text-emerald-300" : "text-amber-300"}`}>{item.kind === "available" ? "Available" : "Unavailable"}</p><strong className="mt-1 block text-sm">{overrideLabel(item, timezone)}</strong>{item.reason ? <p className="mt-1 text-xs text-[var(--color-bone-muted)]">{item.reason}</p> : null}</div><button type="button" disabled={saving} onClick={() => void remove(item)} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-brass)] disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />Restore</button></li>)}</ul>}
      </section>
    </div>
  );
}
