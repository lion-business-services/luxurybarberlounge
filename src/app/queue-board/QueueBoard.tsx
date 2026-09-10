"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, CreditCard, Maximize2, RefreshCw, Scissors, TimerReset, WalletCards, Wifi, WifiOff } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Entry = {
  position: number;
  kind?: "walk_in" | "appointment";
  label: string;
  token: string;
  barber: string;
  service?: string;
  status: string;
  scheduledAt?: string | null;
  expectedServiceAt?: string | null;
  estimatedWaitMinutes: number | null;
  paymentStatus?: string;
  paymentMethod?: string | null;
};

type QueueResponse = {
  ok?: boolean;
  location?: string;
  generatedAt?: string;
  entries?: Entry[];
};

type RealtimeState = "connecting" | "live" | "fallback";
const servingStatuses = new Set(["called", "ready", "in_service"]);
const FALLBACK_REFRESH_MS = 5000;
const REALTIME_REFRESH_DEBOUNCE_MS = 120;

const formatTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(value))
  : "Pending";
const pretty = (value?: string | null) => value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—";

export function QueueBoard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [location, setLocation] = useState("Northfield");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [apiConnected, setApiConnected] = useState(true);
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("connecting");
  const requestSequence = useRef(0);
  const realtimeRefreshTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    try {
      const response = await fetch("/api/queue/display", { cache: "no-store" });
      const result = await response.json() as QueueResponse;
      if (!response.ok || !result.ok) throw new Error("Queue display unavailable");
      if (requestId !== requestSequence.current) return;
      setEntries(result.entries ?? []);
      setLocation(result.location ?? "Northfield");
      setUpdatedAt(result.generatedAt ? new Date(result.generatedAt) : new Date());
      setApiConnected(true);
    } catch (error) {
      console.error("queue-board-load-failed", error);
      if (requestId === requestSequence.current) setApiConnected(false);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    const initial = window.setTimeout(() => { if (!disposed) void load(); }, 0);
    const fallback = window.setInterval(() => { if (!disposed) void load(); }, FALLBACK_REFRESH_MS);
    const supabase = getBrowserSupabase();

    const reconnect = () => { if (!disposed) void load(); };
    const visible = () => { if (!disposed && document.visibilityState === "visible") void load(); };
    window.addEventListener("online", reconnect);
    window.addEventListener("focus", reconnect);
    document.addEventListener("visibilitychange", visible);

    if (!supabase) {
      const timer = window.setTimeout(() => { if (!disposed) setRealtimeState("fallback"); }, 0);
      return () => {
        disposed = true;
        window.clearTimeout(initial); window.clearTimeout(timer); window.clearInterval(fallback);
        window.removeEventListener("online", reconnect); window.removeEventListener("focus", reconnect); document.removeEventListener("visibilitychange", visible);
      };
    }

    const scheduleRefresh = () => {
      if (disposed) return;
      if (realtimeRefreshTimer.current !== null) window.clearTimeout(realtimeRefreshTimer.current);
      realtimeRefreshTimer.current = window.setTimeout(() => {
        realtimeRefreshTimer.current = null;
        if (!disposed) void load();
      }, REALTIME_REFRESH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("queue-display:northfield", { config: { private: false } })
      .on("broadcast", { event: "queue_changed" }, () => { setRealtimeState("live"); scheduleRefresh(); })
      .subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") { setRealtimeState("live"); void load(); }
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) setRealtimeState("fallback");
      });

    return () => {
      disposed = true;
      window.clearTimeout(initial); window.clearInterval(fallback);
      window.removeEventListener("online", reconnect); window.removeEventListener("focus", reconnect); document.removeEventListener("visibilitychange", visible);
      if (realtimeRefreshTimer.current !== null) window.clearTimeout(realtimeRefreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const nowServing = useMemo(() => entries.filter((entry) => servingStatuses.has(entry.status)), [entries]);
  const waiting = useMemo(() => entries.filter((entry) => !servingStatuses.has(entry.status)), [entries]);

  async function fullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => undefined);
    else await document.exitFullscreen().catch(() => undefined);
  }

  const connectionLabel = !apiConnected ? "Reconnecting" : realtimeState === "live" ? "Live" : realtimeState === "connecting" ? "Connecting" : "Auto-refresh";

  return (
    <main className="min-h-screen bg-[#070707] px-5 py-6 text-[#f4eee3] sm:px-10 sm:py-8 lg:px-14">
      <header className="flex flex-col gap-5 border-b border-[#c99a3e]/25 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[.32em] text-[#c99a3e]">Luxury Barber Lounge · {location}</p>
          <h1 className="font-display mt-3 text-4xl sm:text-6xl lg:text-7xl">Live queue</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#bdb4a7]">Live walk-ins, barber assignment, expected chair time, remaining wait and payment status. The board refreshes automatically.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 items-center gap-2 rounded-full border border-white/10 px-4 text-xs uppercase tracking-[.16em]" aria-live="polite">{apiConnected && realtimeState === "live" ? <Wifi className="h-4 w-4 text-[#c99a3e]" /> : <WifiOff className="h-4 w-4 text-[#c99a3e]" />}{connectionLabel}</div>
          <button type="button" onClick={() => void load()} className="grid h-12 w-12 place-items-center rounded-full border border-white/10" aria-label="Refresh queue"><RefreshCw className="h-5 w-5" /></button>
          <button type="button" onClick={() => void fullscreen()} className="grid h-12 w-12 place-items-center rounded-full bg-[#c99a3e] text-black" aria-label="Full screen"><Maximize2 className="h-5 w-5" /></button>
        </div>
      </header>

      {!apiConnected ? <div className="mt-6 rounded-xl border border-[#c99a3e]/30 bg-[#c99a3e]/5 p-4 text-sm">Reconnecting to the live queue. The last confirmed state remains visible.</div> : null}

      <section className="mt-7 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <article className="rounded-3xl border border-[#c99a3e]/25 bg-[#111]/95 p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[.25em] text-[#c99a3e]">Now serving</p>
          {nowServing.length ? <div className="mt-6 grid gap-4">{nowServing.map((entry) => <ServingCard key={`${entry.token}-${entry.status}`} entry={entry} />)}</div> : <div className="grid min-h-64 place-items-center text-center"><div><Scissors className="mx-auto h-8 w-8 text-[#c99a3e]" /><h2 className="font-display mt-4 text-3xl">Preparing the next chair</h2><p className="mt-2 text-sm text-[#a89f92]">Reception will call the next guest shortly.</p></div></div>}
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.25em] text-[#c99a3e]">Up next</p><h2 className="font-display mt-2 text-3xl sm:text-4xl">Waiting guests</h2></div><span className="rounded-full border border-white/10 px-4 py-2 text-xs text-[#bdb4a7]">{waiting.length} waiting</span></div>
          {waiting.length ? <div className="mt-6 grid gap-3">{waiting.slice(0, 14).map((entry) => <QueueCard key={`${entry.token}-${entry.position}-${entry.status}`} entry={entry} />)}</div> : <div className="grid min-h-64 place-items-center text-center text-[#a89f92]">No guests are currently waiting.</div>}
        </article>
      </section>

      <footer className="mt-7 flex flex-col gap-2 border-t border-white/[.07] pt-5 text-xs text-[#81796f] sm:flex-row sm:items-center sm:justify-between"><p>Wait times are live estimates and may change as services progress.</p><p>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : "Connecting…"}</p></footer>
    </main>
  );
}

function QueueCard({ entry }: { entry: Entry }) {
  const paid = entry.paymentStatus === "paid";
  return <div className="grid gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 sm:grid-cols-[auto_1.2fr_.9fr_.9fr] sm:items-center">
    <span className="font-display grid h-11 w-11 place-items-center rounded-full bg-[#c99a3e]/10 text-xl text-[#d8aa45]">{entry.position}</span>
    <div><p className="text-xl font-semibold">{entry.label}</p><p className="mt-1 text-sm text-[#a89f92]">{entry.service ?? "Service"} · {entry.barber}</p></div>
    <div className="text-sm"><p className="flex items-center gap-2 text-[#d8aa45]"><TimerReset className="h-4 w-4" />{entry.estimatedWaitMinutes == null ? "Estimate pending" : entry.estimatedWaitMinutes <= 0 ? "Ready now" : `${entry.estimatedWaitMinutes} min remaining`}</p><p className="mt-1 text-xs text-[#8e867c]"><Clock3 className="mr-1 inline h-3.5 w-3.5" />Expected {formatTime(entry.expectedServiceAt)}</p></div>
    <div className="sm:text-right"><p className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[.13em] ${paid ? "border-emerald-400/30 text-emerald-300" : "border-white/10 text-[#a89f92]"}`}>{paid ? <CreditCard className="h-3.5 w-3.5" /> : <WalletCards className="h-3.5 w-3.5" />}{paid ? `Paid · ${pretty(entry.paymentMethod)}` : entry.paymentStatus === "pending" ? `Payment pending · ${pretty(entry.paymentMethod)}` : "Unpaid"}</p></div>
  </div>;
}

function ServingCard({ entry }: { entry: Entry }) {
  const heading = entry.status === "in_service" ? "Now serving" : entry.status === "ready" ? "Ready" : "Please proceed";
  return <div className="rounded-2xl bg-[#c99a3e] p-5 text-black sm:p-7"><p className="text-[10px] uppercase tracking-[.24em]">{heading}</p><p className="font-display mt-2 text-4xl sm:text-5xl">{entry.label}</p><p className="mt-3 text-base font-semibold">{entry.service ?? "Service"} · {entry.barber}</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[.12em]"><span className="rounded-full bg-black/10 px-3 py-2">{entry.status === "in_service" ? "Service in progress" : `Expected ${formatTime(entry.expectedServiceAt)}`}</span><span className="rounded-full bg-black/10 px-3 py-2">{entry.paymentStatus === "paid" ? `Paid · ${pretty(entry.paymentMethod)}` : entry.paymentStatus === "pending" ? "Payment pending" : "Unpaid"}</span></div></div>;
}
