"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Maximize2, RefreshCw, Scissors } from "lucide-react";

type Entry = {
  position: number;
  label: string;
  token: string;
  barber: string;
  status: string;
  estimatedWaitMinutes: number | null;
};

type Response = { ok?: boolean; location?: string; generatedAt?: string; entries?: Entry[] };

const servingStatuses = new Set(["called", "ready", "in_service"]);

export function QueueBoard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [location, setLocation] = useState("Northfield");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [connected, setConnected] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/queue/display", { cache: "no-store" });
      const result = await response.json() as Response;
      if (!response.ok || !result.ok) throw new Error("Queue unavailable");
      setEntries(result.entries ?? []);
      setLocation(result.location ?? "Northfield");
      setUpdatedAt(result.generatedAt ? new Date(result.generatedAt) : new Date());
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const nowServing = useMemo(() => entries.filter((entry) => servingStatuses.has(entry.status)), [entries]);
  const waiting = useMemo(() => entries.filter((entry) => !servingStatuses.has(entry.status)), [entries]);

  async function fullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => undefined);
    else await document.exitFullscreen().catch(() => undefined);
  }

  return (
    <main className="min-h-screen bg-[#070707] px-5 py-6 text-[#f4eee3] sm:px-10 sm:py-8 lg:px-14">
      <header className="flex flex-col gap-5 border-b border-[#c99a3e]/25 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[.32em] text-[#c99a3e]">Luxury Barber Lounge · {location}</p>
          <h1 className="font-display mt-3 text-4xl sm:text-6xl lg:text-7xl">Who’s next</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#bdb4a7]">Live walk-in status. Names appear only when the guest has chosen to share a privacy-safe label.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => void load()} className="grid h-12 w-12 place-items-center rounded-full border border-white/10" aria-label="Refresh queue"><RefreshCw className="h-5 w-5" /></button>
          <button onClick={() => void fullscreen()} className="grid h-12 w-12 place-items-center rounded-full bg-[#c99a3e] text-black" aria-label="Full screen"><Maximize2 className="h-5 w-5" /></button>
        </div>
      </header>

      {!connected ? <div className="mt-6 rounded-xl border border-[#c99a3e]/30 bg-[#c99a3e]/5 p-4 text-sm">Reconnecting to the live queue. The last confirmed display remains visible.</div> : null}

      <section className="mt-7 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <article className="rounded-3xl border border-[#c99a3e]/25 bg-[#111]/95 p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[.25em] text-[#c99a3e]">Now serving</p>
          {nowServing.length ? (
            <div className="mt-6 grid gap-4">
              {nowServing.map((entry) => <ServingCard key={`${entry.token}-${entry.barber}`} entry={entry} />)}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center text-center">
              <div><Scissors className="mx-auto h-8 w-8 text-[#c99a3e]" /><h2 className="font-display mt-4 text-3xl">Preparing the next chair</h2><p className="mt-2 text-sm text-[#a89f92]">Reception will call the next guest shortly.</p></div>
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[.25em] text-[#c99a3e]">Up next</p><h2 className="font-display mt-2 text-3xl sm:text-4xl">Waiting guests</h2></div>
            <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-[#bdb4a7]">{waiting.length} waiting</span>
          </div>
          {waiting.length ? (
            <div className="mt-6 grid gap-3">
              {waiting.slice(0, 12).map((entry) => (
                <div key={entry.token} className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#c99a3e]/10 font-display text-xl text-[#d8aa45]">{entry.position}</span>
                  <div><p className="text-xl font-semibold">{entry.label}</p><p className="mt-1 text-sm text-[#a89f92]">Assigned to {entry.barber}</p></div>
                  <div className="col-start-2 flex items-center gap-2 text-sm text-[#d8aa45] sm:col-start-auto"><Clock3 className="h-4 w-4" />{entry.estimatedWaitMinutes == null ? "Estimate pending" : `About ${entry.estimatedWaitMinutes} min`}</div>
                </div>
              ))}
            </div>
          ) : <div className="grid min-h-64 place-items-center text-center text-[#a89f92]">No guests are currently waiting.</div>}
        </article>
      </section>

      <footer className="mt-7 flex flex-col gap-2 border-t border-white/[.07] pt-5 text-xs text-[#81796f] sm:flex-row sm:items-center sm:justify-between">
        <p>Please remain in the lounge. Wait times are estimates and may change with service needs.</p>
        <p>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Connecting…"}</p>
      </footer>
    </main>
  );
}

function ServingCard({ entry }: { entry: Entry }) {
  return <div className="rounded-2xl bg-[#c99a3e] p-5 text-black sm:p-7"><p className="text-[10px] uppercase tracking-[.24em]">Please proceed</p><p className="font-display mt-2 text-4xl sm:text-5xl">{entry.label}</p><p className="mt-3 text-base font-semibold">{entry.barber}</p><p className="mt-1 text-sm opacity-75">Please proceed when called</p></div>;
}
