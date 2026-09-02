"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, LoaderCircle } from "lucide-react";

type CompletedEntry = {
  id: string;
  publicToken: string;
  clientName: string | null;
  serviceName: string;
  servicePriceCents: number | null;
  status: "completed";
  walkInAt: string | null;
  completedAt: string | null;
  assignedBarberName: string;
  paymentMethod: "cash" | "square" | null;
  paymentStatus: string | null;
  paidAmountCents: number | null;
  tipCents: number;
  receiptNumber: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
};

type ResponseBody = {
  ok?: boolean;
  loungeDate?: string;
  entries?: CompletedEntry[];
  message?: string;
};

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

function money(cents: number | null) {
  if (typeof cents !== "number") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function dateTime(value: string | null) {
  return value ? formatter.format(new Date(value)) : "Time not recorded";
}

export function CompletedWalkInsToday() {
  const [entries, setEntries] = useState<CompletedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/operations/queue/completed", { cache: "no-store", signal });
      const result = (await response.json()) as ResponseBody;
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Completed walk-ins could not be loaded.");
      setEntries(result.entries ?? []);
      setMessage("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Completed walk-ins could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => void load(controller.signal), 0);
    const timer = window.setInterval(() => void load(), 5_000);
    return () => {
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  return (
    <section className="mt-10 border-t border-white/[.07] pt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[.28em] text-[var(--color-brass)]">Today&apos;s history</p>
          <h2 className="font-display mt-2 text-3xl">Completed walk-ins</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">
            Completed guests remain here with their payment method and Square receipt so the client, service, barber, money, and receipt stay reconciled on one record.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[.16em] text-[var(--color-bone-muted)]">{entries.length} completed</span>
      </div>

      {message ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-100">{message}</div>
      ) : loading ? (
        <div className="grid min-h-32 place-items-center rounded-xl border border-white/[.07]"><LoaderCircle className="h-5 w-5 animate-spin text-[var(--color-brass)]" /></div>
      ) : entries.length ? (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <article key={entry.id} className="grid gap-4 rounded-2xl border border-white/[.07] bg-white/[.02] p-4 xl:grid-cols-[1.25fr_.85fr_.9fr_1fr_auto] xl:items-center">
              <div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[var(--color-brass)]" /><strong className="text-sm">{entry.clientName ?? `Guest ${entry.publicToken.slice(-4)}`}</strong></div>
                <p className="mt-1 text-xs text-[var(--color-bone-muted)]">{entry.serviceName} · {money(entry.paidAmountCents ?? entry.servicePriceCents)}</p>
                {entry.tipCents > 0 ? <p className="mt-1 text-[10px] text-[var(--color-bone-muted)]">Tip {money(entry.tipCents)}</p> : null}
              </div>
              <div><p className="text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Assigned barber</p><p className="mt-1 text-sm">{entry.assignedBarberName}</p></div>
              <div><p className="text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Walk-in time</p><p className="mt-1 text-sm">{dateTime(entry.walkInAt)}</p></div>
              <div>
                <p className="text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Payment reconciliation</p>
                {entry.paymentStatus === "paid" ? (
                  <div className="mt-1">
                    <p className="text-sm capitalize">{entry.paymentMethod} · {money(entry.paidAmountCents)}</p>
                    {entry.paymentMethod === "square" && entry.receiptUrl ? (
                      <a href={entry.receiptUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[.12em] text-[var(--color-brass)]">Receipt {entry.receiptNumber ?? "Square"}<ExternalLink className="h-3 w-3" /></a>
                    ) : entry.paymentMethod === "cash" ? <p className="mt-1 text-[10px] text-emerald-300">Cash received</p> : null}
                  </div>
                ) : <p className="mt-1 text-xs text-amber-200">Payment record needs review</p>}
              </div>
              <div className="text-left xl:text-right">
                <span className="inline-flex rounded-full border border-[var(--color-brass)]/25 bg-[var(--color-brass)]/5 px-3 py-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-brass)]">Completed</span>
                {entry.completedAt ? <p className="mt-2 text-[10px] text-[var(--color-bone-muted)]">{timeFormatter.format(new Date(entry.completedAt))}</p> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--color-ink-line)] p-6 text-sm text-[var(--color-bone-muted)]">No completed walk-ins yet today. Completed guests will appear here automatically.</div>
      )}
    </section>
  );
}
