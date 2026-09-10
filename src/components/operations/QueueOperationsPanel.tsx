"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, LoaderCircle, Plus, RefreshCw, Sparkles, TimerReset, WalletCards } from "lucide-react";

type Payment = {
  id: string;
  status: "pending" | "paid" | "refunded" | "voided" | "unmatched";
  paymentMethod: "cash" | "square";
  amountCents: number;
  tipCents: number;
  squarePaymentUrl?: string | null;
  squareReceiptNumber?: string | null;
  squareReceiptUrl?: string | null;
  paidAt?: string | null;
};

type QueueEntry = {
  id: string;
  publicToken: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  serviceName: string;
  barberPreference: string | null;
  status: string;
  remainingMinutes: number | null;
  walkInAt: string;
  expectedServiceAt: string | null;
  servicePriceCents: number | null;
  assignedBarberId: string | null;
  assignedBarberName: string | null;
  payment: Payment | null;
};

type Barber = {
  userId: string;
  displayName: string;
  acceptingWalkIns: boolean;
  availabilityStatus: string;
};

type QueueResponse = {
  ok?: boolean;
  entries?: QueueEntry[];
  barbers?: Barber[];
  live?: boolean;
  message?: string;
  decision?: { reasons?: string[] };
};

type PaymentResponse = {
  ok?: boolean;
  message?: string;
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const time = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "Pending";
const dateTime = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

type PaymentSelection = "unpaid" | "paid_cash" | "paid_square";

export function QueueOperationsPanel() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [amountOverrides, setAmountOverrides] = useState<Record<string, string>>({});
  const [live, setLive] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentBusyId, setPaymentBusyId] = useState<string | null>(null);

  const loadQueue = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/operations/queue/snapshot", { cache: "no-store", signal });
    const result = await response.json() as QueueResponse;
    if (!response.ok || !result.ok) throw new Error(result.message ?? "The queue could not be loaded.");
    setEntries(result.entries ?? []);
    setBarbers(result.barbers ?? []);
    setLive(Boolean(result.live));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => void loadQueue(controller.signal).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "The queue could not be loaded.");
    }), 0);
    const timer = window.setInterval(() => void loadQueue().catch(() => undefined), 3000);
    return () => { controller.abort(); window.clearTimeout(initial); window.clearInterval(timer); };
  }, [loadQueue]);

  const waiting = useMemo(() => entries.filter((entry) => ["waiting", "confirmed", "checked_in"].includes(entry.status)).length, [entries]);
  const assigned = useMemo(() => entries.filter((entry) => ["assigned", "called", "ready", "in_service"].includes(entry.status)).length, [entries]);
  const paid = useMemo(() => entries.filter((entry) => entry.payment?.status === "paid").length, [entries]);

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

  function amountFor(entry: QueueEntry) {
    const cents = entry.payment?.amountCents ?? entry.servicePriceCents ?? 0;
    return amountOverrides[entry.id] ?? (cents > 0 ? (cents / 100).toFixed(2) : "");
  }

  function paymentSelection(entry: QueueEntry): PaymentSelection {
    if (entry.payment?.status !== "paid") return "unpaid";
    return entry.payment.paymentMethod === "square" ? "paid_square" : "paid_cash";
  }

  async function setPaymentStatus(entry: QueueEntry, selection: PaymentSelection) {
    const currentlyPaid = entry.payment?.status === "paid";
    const status = selection === "unpaid" ? "unpaid" : "paid";
    const paymentMethod = selection === "paid_square" ? "square" : selection === "paid_cash" ? "cash" : undefined;

    let amountCents: number | undefined;
    if (status === "paid") {
      const dollars = Number(amountFor(entry));
      if (!Number.isFinite(dollars) || dollars <= 0) {
        setMessage("Enter the final service amount before marking this walk-in paid.");
        await loadQueue();
        return;
      }
      amountCents = Math.round(dollars * 100);
      const methodLabel = paymentMethod === "square" ? "Square" : "cash";
      if (!window.confirm(`Mark ${entry.clientName ?? "this walk-in"} PAID by ${methodLabel} for ${money(amountCents)}?`)) {
        await loadQueue();
        return;
      }
    } else if (currentlyPaid) {
      if (!window.confirm(`Change ${entry.clientName ?? "this walk-in"} back to UNPAID? This also removes any provisional commission created from this payment.`)) {
        await loadQueue();
        return;
      }
    }

    setPaymentBusyId(entry.id);
    setMessage(status === "paid" ? "Saving paid status…" : "Saving unpaid status…");
    try {
      const response = await fetch("/api/operations/queue/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "set_manual_status",
          queueEntryId: entry.id,
          status,
          paymentMethod,
          amountCents,
        }),
      });
      const result = await response.json() as PaymentResponse;
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Payment status could not be updated.");
      setMessage(status === "paid"
        ? `Marked PAID${paymentMethod ? ` · ${paymentMethod === "square" ? "Square" : "Cash"}` : ""}. The live Queue Board will update automatically.`
        : "Marked UNPAID. The live Queue Board will update automatically.");
      await loadQueue();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment status could not be updated.");
      await loadQueue().catch(() => undefined);
    } finally {
      setPaymentBusyId(null);
    }
  }

  return (
    <div>
      <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Live operations</p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl">Walk-in queue</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">One live workspace for guest details, barber assignment, service timing, payment status and completion. New walk-ins refresh automatically every few seconds.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/walk-ins" target="_blank" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] tracking-[.18em] uppercase"><Plus className="h-4 w-4" />Add walk-in</Link>
          <Link href="/admin/payments" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] tracking-[.18em] uppercase"><WalletCards className="h-4 w-4" />Payment tracking</Link>
          <Link href="/queue-board" target="_blank" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] tracking-[.18em] uppercase"><ExternalLink className="h-4 w-4" />TV display</Link>
          <button type="button" onClick={refresh} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] tracking-[.18em] uppercase disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button>
          <button type="button" onClick={() => action({ action: "who_next" })} disabled={busy || !live || waiting === 0} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)] disabled:opacity-50"><Sparkles className="h-4 w-4" />Assign next</button>
        </div>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Summary label="Waiting" value={String(waiting)} />
        <Summary label="Assigned / serving" value={String(assigned)} />
        <Summary label="Paid active" value={String(paid)} />
        <Summary label="Available barbers" value={String(barbers.filter((barber) => barber.acceptingWalkIns && barber.availabilityStatus === "available").length)} />
      </div>

      {message ? <div role="status" className="mb-5 rounded-lg border border-[var(--color-brass)]/25 bg-[var(--color-brass)]/5 px-4 py-3 text-xs leading-5">{message}</div> : null}

      {busy && entries.length === 0 ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-[var(--color-brass)]" /></div> : entries.length ? (
        <div className="grid gap-3">
          {entries.map((entry, index) => {
            const payment = entry.payment;
            const isPaid = payment?.status === "paid";
            return (
              <article key={entry.id} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-5">
                <div className="grid gap-5 xl:grid-cols-[auto_1.35fr_1fr_1fr_1fr_1.15fr] xl:items-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-brass)]/10 font-display text-lg text-[var(--color-brass)]">{index + 1}</span>
                  <div>
                    <strong className="text-base">{entry.clientName ?? `Guest ${entry.publicToken.slice(-4)}`}</strong>
                    <p className="mt-1 text-xs text-[var(--color-bone-muted)]">{entry.clientPhone || "No phone"}{entry.clientEmail ? ` · ${entry.clientEmail}` : ""}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[.12em] text-[var(--color-brass)]">{entry.serviceName} · Token {entry.publicToken.slice(-4)}</p>
                  </div>
                  <div>
                    <span className="form-label">Timing</span>
                    <p className="text-sm">Arrived {dateTime(entry.walkInAt)}</p>
                    <p className="mt-1 text-xs text-[var(--color-bone-muted)]">Expected chair {time(entry.expectedServiceAt)}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[.12em] text-[var(--color-brass)]"><TimerReset className="h-3.5 w-3.5" />{entry.remainingMinutes == null ? "Estimate pending" : entry.remainingMinutes <= 0 ? "Ready now" : `${entry.remainingMinutes} min remaining`}</p>
                  </div>
                  <label><span className="form-label">Barber</span><select value={entry.assignedBarberId ?? ""} onChange={(event) => event.target.value && action({ action: "assign", entryId: entry.id, barberId: event.target.value })} className="form-control text-xs"><option value="">First available</option>{barbers.map((barber) => <option key={barber.userId} value={barber.userId}>{barber.displayName}{barber.availabilityStatus !== "available" ? ` · ${pretty(barber.availabilityStatus)}` : ""}</option>)}</select><p className="mt-1 text-[10px] text-[var(--color-bone-muted)]">{entry.assignedBarberName ?? entry.barberPreference ?? "Unassigned"}</p></label>
                  <label><span className="form-label">Queue status</span><select value={entry.status} onChange={(event) => action({ action: "set_status", entryId: entry.id, status: event.target.value })} className="form-control text-xs"><option value="waiting">Waiting</option><option value="confirmed">Confirmed</option><option value="checked_in">Checked in</option><option value="assigned">Assigned</option><option value="called">Called</option><option value="ready">Ready</option><option value="in_service">In service</option><option value="completed">Completed</option><option value="no_show">No-show</option><option value="removed">Removed</option></select></label>
                  <div>
                    <span className="form-label">Payment</span>
                    <div className="grid grid-cols-[.85fr_1.15fr] gap-2">
                      <input aria-label={`Amount for ${entry.clientName ?? "walk-in"}`} inputMode="decimal" value={amountFor(entry)} onChange={(event) => setAmountOverrides((current) => ({ ...current, [entry.id]: event.target.value }))} disabled={isPaid || paymentBusyId === entry.id} className="form-control text-xs" placeholder="0.00" />
                      <select aria-label={`Payment status for ${entry.clientName ?? "walk-in"}`} value={paymentSelection(entry)} disabled={paymentBusyId === entry.id} onChange={(event) => void setPaymentStatus(entry, event.target.value as PaymentSelection)} className="form-control text-xs"><option value="unpaid">Unpaid</option><option value="paid_cash">Paid — Cash</option><option value="paid_square">Paid — Square</option></select>
                    </div>
                    <p className={`mt-2 text-[10px] uppercase tracking-[.12em] ${isPaid ? "text-emerald-300" : "text-[var(--color-bone-muted)]"}`}>{isPaid ? `Paid · ${payment?.paymentMethod === "square" ? "Square" : "Cash"} · ${money(payment?.amountCents ?? 0)}` : "Unpaid"}</p>
                    <p className="mt-1 text-[9px] text-[var(--color-bone-muted)]">Admin controls this status. The Queue Board mirrors it automatically.</p>
                    {paymentBusyId === entry.id ? <p className="mt-1 text-[9px] text-[var(--color-bone-muted)]">Updating payment…</p> : null}
                  </div>
                </div>
                {isPaid && payment?.squareReceiptUrl ? <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-white/[.06] pt-4"><a href={payment.squareReceiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 px-3 py-2 text-[9px] uppercase tracking-[.12em] text-emerald-300"><ExternalLink className="h-3 w-3" />Receipt {payment.squareReceiptNumber ?? "Square"}</a></div> : null}
              </article>
            );
          })}
        </div>
      ) : <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--color-ink-line)] p-8 text-center"><div><h2 className="font-display text-2xl">No active queue entries</h2><p className="mt-3 text-sm text-[var(--color-bone-muted)]">{live ? "New walk-ins will appear here automatically within a few seconds." : "Live queue service is unavailable."}</p></div></div>}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-4"><p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-bone-muted)]">{label}</p><p className="font-display mt-2 text-3xl">{value}</p></div>;
}
