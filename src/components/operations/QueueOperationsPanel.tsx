"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, LoaderCircle, Plus, RefreshCw, Sparkles } from "lucide-react";

type QueueEntry = {
  id: string;
  publicToken: string;
  clientName: string | null;
  serviceName: string;
  barberPreference: string | null;
  status: string;
  estimatedWaitMinutes: number | null;
  joinedAt: string;
  assignedBarberId: string | null;
  assignedBarberName: string | null;
};

type Barber = {
  userId: string;
  displayName: string;
  acceptingWalkIns: boolean;
  availabilityStatus: string;
};

type QueueResponse = {
  entries?: QueueEntry[];
  barbers?: Barber[];
  live?: boolean;
  message?: string;
  decision?: { reasons?: string[] };
};

export function QueueOperationsPanel() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [live, setLive] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const applyResponse = useCallback((result: QueueResponse) => {
    setEntries(result.entries ?? []);
    setBarbers(result.barbers ?? []);
    setLive(Boolean(result.live));
    if (result.message) setMessage(result.message);
  }, []);

  const loadQueue = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/operations/queue", { cache: "no-store", signal });
    const result = await response.json() as QueueResponse;
    if (!response.ok) throw new Error(result.message ?? "The queue could not be loaded.");
    applyResponse(result);
  }, [applyResponse]);

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => {
      void loadQueue(controller.signal).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "The queue could not be loaded.");
      });
    }, 0);
    const timer = window.setInterval(() => void loadQueue().catch(() => undefined), 5000);
    return () => { controller.abort(); window.clearTimeout(initial); window.clearInterval(timer); };
  }, [loadQueue]);

  const waiting = useMemo(() => entries.filter((entry) => ["waiting", "confirmed", "checked_in"].includes(entry.status)).length, [entries]);
  const assigned = useMemo(() => entries.filter((entry) => ["assigned", "called", "ready", "in_service"].includes(entry.status)).length, [entries]);

  async function refresh() {
    setBusy(true); setMessage("");
    try { await loadQueue(); } catch (error) { setMessage(error instanceof Error ? error.message : "The queue could not be refreshed."); }
    finally { setBusy(false); }
  }

  async function action(payload: Record<string, string>) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/operations/queue", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as QueueResponse;
      if (!response.ok) throw new Error(result.message ?? "The queue could not be updated.");
      setMessage(result.decision?.reasons?.join(" · ") || "Queue updated.");
      await loadQueue();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The queue could not be updated."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Live operations</p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl">Walk-in queue</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-bone-muted)]">Check guests in, assign an available barber, update service status, and keep the in-shop display current automatically.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/walk-ins" target="_blank" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] tracking-[.18em] uppercase"><Plus className="h-4 w-4" />Add walk-in</Link>
          <Link href="/queue-board" target="_blank" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] tracking-[.18em] uppercase"><ExternalLink className="h-4 w-4" />TV display</Link>
          <button type="button" onClick={refresh} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] tracking-[.18em] uppercase disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button>
          <button type="button" onClick={() => action({ action: "who_next" })} disabled={busy || !live || waiting === 0} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)] disabled:opacity-50"><Sparkles className="h-4 w-4" />Assign next</button>
        </div>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Summary label="Waiting" value={String(waiting)} />
        <Summary label="Assigned / serving" value={String(assigned)} />
        <Summary label="Available barbers" value={String(barbers.filter((barber) => barber.acceptingWalkIns && barber.availabilityStatus === "available").length)} />
      </div>

      {message ? <div role="status" className="mb-5 rounded-lg border border-[var(--color-brass)]/25 bg-[var(--color-brass)]/5 px-4 py-3 text-xs leading-5">{message}</div> : null}

      {busy && entries.length === 0 ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-[var(--color-brass)]" /></div> : entries.length ? (
        <div className="grid gap-3">
          {entries.map((entry, index) => (
            <article key={entry.id} className="grid gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 lg:grid-cols-[auto_1.3fr_1fr_1fr_auto] lg:items-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-brass)]/10 font-display text-lg text-[var(--color-brass)]">{index + 1}</span>
              <div><strong className="text-sm">{entry.clientName ?? `Guest ${entry.publicToken.slice(-4)}`}</strong><p className="mt-1 text-xs text-[var(--color-bone-muted)]">{entry.serviceName} · {entry.estimatedWaitMinutes == null ? "Estimate pending" : `about ${entry.estimatedWaitMinutes} min`}</p></div>
              <label><span className="form-label">Barber</span><select value={entry.assignedBarberId ?? ""} onChange={(event) => event.target.value && action({ action: "assign", entryId: entry.id, barberId: event.target.value })} className="form-control text-xs"><option value="">First available</option>{barbers.map((barber) => <option key={barber.userId} value={barber.userId}>{barber.displayName}{barber.availabilityStatus !== "available" ? ` · ${barber.availabilityStatus.replaceAll("_", " ")}` : ""}</option>)}</select></label>
              <label><span className="form-label">Status</span><select value={entry.status} onChange={(event) => action({ action: "set_status", entryId: entry.id, status: event.target.value })} className="form-control text-xs"><option value="waiting">Waiting</option><option value="confirmed">Confirmed</option><option value="checked_in">Checked in</option><option value="assigned">Assigned</option><option value="called">Called</option><option value="ready">Ready</option><option value="in_service">In service</option><option value="completed">Completed</option><option value="no_show">No-show</option><option value="removed">Removed</option></select></label>
              <span className="rounded-full border border-white/10 px-3 py-2 text-center text-[9px] uppercase tracking-[.13em] text-[var(--color-bone-muted)]">{entry.assignedBarberName ?? "Unassigned"}</span>
            </article>
          ))}
        </div>
      ) : <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--color-ink-line)] p-8 text-center"><div><h2 className="font-display text-2xl">No active queue entries</h2><p className="mt-3 text-sm text-[var(--color-bone-muted)]">{live ? "New walk-ins will appear here automatically." : "Apply the latest Supabase migration and enable the walk-in queue."}</p></div></div>}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-4"><p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-bone-muted)]">{label}</p><p className="font-display mt-2 text-3xl">{value}</p></div>;
}
