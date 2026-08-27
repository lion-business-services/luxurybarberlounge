"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarOff, Check, X, Loader2 } from "lucide-react";

type Entry = {
  id: string;
  barber_name: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  status: string;
  availability_kind?: "available" | "unavailable";
};

const statusStyles: Record<string, string> = {
  approved: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300",
  requested: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  declined: "border-rose-400/50 bg-rose-400/10 text-rose-300",
  cancelled: "border-white/15 bg-white/5 text-[var(--color-bone-muted)]",
};

function range(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  const dateOpts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  if (sameDay) return `${start.toLocaleDateString("en-US", dateOpts)} · ${start.toLocaleTimeString("en-US", timeOpts)} – ${end.toLocaleTimeString("en-US", timeOpts)}`;
  return `${start.toLocaleDateString("en-US", dateOpts)} – ${end.toLocaleDateString("en-US", dateOpts)}`;
}

export function AdminTimeOffWorkspace() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [scope, setScope] = useState<"upcoming" | "pending" | "all">("upcoming");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/admin/time-off?scope=${scope}`, { cache: "no-store" });
      const result = await response.json();
      setEntries(result.entries ?? []);
    } catch {
      if (!quiet) setMessage("Availability could not be loaded.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 15000);
    const refresh = () => void load(true);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  async function decide(id: string, decision: "approved" | "declined") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/time-off", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      const result = await response.json();
      setMessage(result.message ?? "Saved.");
      await load();
    } catch {
      setMessage("The decision could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="portal-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Barber availability</h2>
          <p className="mt-1 text-sm text-[var(--color-bone-muted)]">Barber-created unavailable periods. Approved periods block new bookings immediately; this view refreshes automatically.</p>
        </div>
        <div className="flex gap-2">
          {(["upcoming", "pending", "all"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setScope(value)} className={`rounded-full border px-4 py-2 text-[9px] tracking-[.14em] uppercase ${scope === value ? "border-[var(--color-brass)] text-[var(--color-brass)]" : "border-[var(--color-ink-line)] text-[var(--color-bone-muted)]"}`}>{value}</button>
          ))}
        </div>
      </div>

      {message ? <p className="mt-4 rounded-lg border border-[var(--color-ink-line)] p-3 text-xs text-[var(--color-bone-muted)]">{message}</p> : null}

      {loading ? <p className="mt-6 text-sm text-[var(--color-bone-muted)]">Loading…</p> : !entries.length ? (
        <div className="mt-6 grid place-items-center rounded-xl border border-[var(--color-ink-line)] py-12 text-center"><CalendarOff className="h-8 w-8 text-[var(--color-brass)]" /><p className="mt-3 text-sm text-[var(--color-bone-muted)]">No availability exceptions recorded for this view.</p></div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="grid gap-3 rounded-xl border border-[var(--color-ink-line)] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{entry.barber_name}</strong><span className="text-[9px] uppercase tracking-[.14em] text-[var(--color-brass)]">{entry.availability_kind === "available" ? "Available" : "Unavailable"}</span></div>
                <p className="mt-1 text-xs text-[var(--color-bone-muted)]">{range(entry.starts_at, entry.ends_at)}</p>
                {entry.reason ? <p className="mt-1 text-xs text-[var(--color-bone-muted)]">{entry.reason}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] tracking-[.14em] uppercase ${statusStyles[entry.status] ?? statusStyles.cancelled}`}>{entry.status}</span>
                {entry.status === "requested" ? <><button type="button" onClick={() => void decide(entry.id, "approved")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 px-3 py-1.5 text-[9px] uppercase tracking-[.14em] text-emerald-300 disabled:opacity-40">{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Approve</button><button type="button" onClick={() => void decide(entry.id, "declined")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/50 px-3 py-1.5 text-[9px] uppercase tracking-[.14em] text-rose-300 disabled:opacity-40"><X className="h-3 w-3" />Decline</button></> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
