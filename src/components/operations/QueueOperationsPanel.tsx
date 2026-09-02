"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, ExternalLink, LoaderCircle, Plus, RefreshCw, Sparkles } from "lucide-react";

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

type WalkInPayment = {
  id: string;
  queue_entry_id: string;
  payment_method: "cash" | "square";
  status: "pending" | "paid" | "refunded" | "voided" | "unmatched";
  amount_cents: number;
  tip_cents: number;
  square_payment_id?: string | null;
  square_order_id?: string | null;
  square_payment_url?: string | null;
  square_receipt_number?: string | null;
  square_receipt_url?: string | null;
  paid_at?: string | null;
};

type PaymentEntry = {
  queueEntryId: string;
  queueStatus: string;
  servicePriceCents: number | null;
  payment: WalkInPayment | null;
};

type PaymentResponse = {
  ok?: boolean;
  entries?: PaymentEntry[];
  message?: string;
  payment?: {
    id?: string;
    status?: string;
    paymentMethod?: string;
    amountCents?: number;
    squarePaymentUrl?: string | null;
  };
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function QueueOperationsPanel() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [amountOverrides, setAmountOverrides] = useState<Record<string, string>>({});
  const [live, setLive] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentBusyId, setPaymentBusyId] = useState<string | null>(null);

  const applyResponse = useCallback((result: QueueResponse) => {
    setEntries(result.entries ?? []);
    setBarbers(result.barbers ?? []);
    setLive(Boolean(result.live));
    if (result.message) setMessage(result.message);
  }, []);

  const loadQueue = useCallback(async (signal?: AbortSignal) => {
    const [queueResponse, paymentResponse] = await Promise.all([
      fetch("/api/operations/queue", { cache: "no-store", signal }),
      fetch("/api/operations/queue/payments", { cache: "no-store", signal }),
    ]);
    const queueResult = await queueResponse.json() as QueueResponse;
    const paymentResult = await paymentResponse.json() as PaymentResponse;
    if (!queueResponse.ok) throw new Error(queueResult.message ?? "The queue could not be loaded.");
    if (!paymentResponse.ok) throw new Error(paymentResult.message ?? "Payment status could not be loaded.");
    applyResponse(queueResult);
    setPaymentEntries(paymentResult.entries ?? []);
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

  const paymentByEntry = useMemo(
    () => new Map(paymentEntries.map((item) => [item.queueEntryId, item])),
    [paymentEntries],
  );

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

  function amountFor(entryId: string) {
    const state = paymentByEntry.get(entryId);
    const cents = state?.payment?.amount_cents ?? state?.servicePriceCents ?? 0;
    return amountOverrides[entryId] ?? (cents > 0 ? (cents / 100).toFixed(2) : "");
  }

  async function paymentAction(entry: QueueEntry, method: "cash" | "square") {
    const state = paymentByEntry.get(entry.id);
    if (state?.payment?.status === "paid") return;
    if (entry.status !== "in_service") {
      setMessage("Set the walk-in to In service before recording payment.");
      return;
    }
    const dollars = Number(amountFor(entry.id));
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setMessage("Enter the final service amount before recording payment.");
      return;
    }
    const amountCents = Math.round(dollars * 100);
    if (method === "cash" && !window.confirm(`Confirm ${money(amountCents)} CASH received from ${entry.clientName ?? "this walk-in"}?`)) return;

    setPaymentBusyId(entry.id);
    setMessage(method === "square" ? "Preparing the client-linked Square checkout..." : "Recording cash payment...");
    try {
      const response = await fetch("/api/operations/queue/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: method === "square" ? "prepare_square" : "record_cash",
          queueEntryId: entry.id,
          amountCents,
        }),
      });
      const result = await response.json() as PaymentResponse;
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Payment could not be updated.");
      if (method === "square") {
        const url = result.payment?.squarePaymentUrl;
        setMessage(url ? "Square checkout prepared. Complete the payment in Square; this queue will reconcile automatically." : "Square checkout prepared.");
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setMessage("Cash payment recorded. Revenue and barber pay have been updated.");
      }
      await loadQueue();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment could not be updated.");
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
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">Run the chair, record Cash or client-linked Square payment, and keep the receipt, revenue, and barber pay reconciled to the same walk-in automatically.</p>
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
          {entries.map((entry, index) => {
            const paymentState = paymentByEntry.get(entry.id);
            const payment = paymentState?.payment;
            const paid = payment?.status === "paid";
            const squarePending = payment?.payment_method === "square" && payment.status === "pending";
            return (
              <article key={entry.id} className="grid gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 xl:grid-cols-[auto_1.25fr_1fr_1fr_1.15fr_auto] xl:items-center">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-brass)]/10 font-display text-lg text-[var(--color-brass)]">{index + 1}</span>
                <div>
                  <strong className="text-sm">{entry.clientName ?? `Guest ${entry.publicToken.slice(-4)}`}</strong>
                  <p className="mt-1 text-xs text-[var(--color-bone-muted)]">{entry.serviceName} · {entry.estimatedWaitMinutes == null ? "Estimate pending" : `about ${entry.estimatedWaitMinutes} min`}</p>
                  {paid ? (
                    <p className="mt-2 text-[10px] uppercase tracking-[.12em] text-emerald-300">
                      Paid {payment.payment_method} · {money(payment.amount_cents)}
                      {payment.square_receipt_number ? ` · Receipt ${payment.square_receipt_number}` : ""}
                    </p>
                  ) : squarePending ? <p className="mt-2 text-[10px] uppercase tracking-[.12em] text-[var(--color-brass)]">Awaiting Square payment</p> : null}
                </div>
                <label><span className="form-label">Barber</span><select value={entry.assignedBarberId ?? ""} onChange={(event) => event.target.value && action({ action: "assign", entryId: entry.id, barberId: event.target.value })} className="form-control text-xs"><option value="">First available</option>{barbers.map((barber) => <option key={barber.userId} value={barber.userId}>{barber.displayName}{barber.availabilityStatus !== "available" ? ` · ${barber.availabilityStatus.replaceAll("_", " ")}` : ""}</option>)}</select></label>
                <label><span className="form-label">Status</span><select value={entry.status} onChange={(event) => action({ action: "set_status", entryId: entry.id, status: event.target.value })} className="form-control text-xs"><option value="waiting">Waiting</option><option value="confirmed">Confirmed</option><option value="checked_in">Checked in</option><option value="assigned">Assigned</option><option value="called">Called</option><option value="ready">Ready</option><option value="in_service">In service</option><option value="completed">Completed</option><option value="no_show">No-show</option><option value="removed">Removed</option></select></label>
                <div>
                  <span className="form-label">Payment</span>
                  <div className="grid grid-cols-[.8fr_1.2fr] gap-2">
                    <input aria-label={`Amount for ${entry.clientName ?? "walk-in"}`} inputMode="decimal" value={amountFor(entry.id)} onChange={(event) => setAmountOverrides((current) => ({ ...current, [entry.id]: event.target.value }))} disabled={paid || paymentBusyId === entry.id} className="form-control text-xs" placeholder="0.00" />
                    <select
                      aria-label={`Payment method for ${entry.clientName ?? "walk-in"}`}
                      value={paid || squarePending ? payment?.payment_method ?? "" : ""}
                      disabled={paid || paymentBusyId === entry.id || entry.status !== "in_service"}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "cash" || value === "square") void paymentAction(entry, value);
                      }}
                      className="form-control text-xs"
                    >
                      <option value="">Unpaid</option>
                      <option value="cash">Cash</option>
                      <option value="square">Square</option>
                    </select>
                  </div>
                  {paymentBusyId === entry.id ? <p className="mt-1 text-[9px] text-[var(--color-bone-muted)]">Updating payment…</p> : null}
                </div>
                <div className="flex flex-col items-stretch gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-2 text-center text-[9px] uppercase tracking-[.13em] text-[var(--color-bone-muted)]">{entry.assignedBarberName ?? "Unassigned"}</span>
                  {squarePending && payment.square_payment_url ? <a href={payment.square_payment_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-full border border-[var(--color-brass)] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[var(--color-brass)]"><CreditCard className="h-3 w-3" />Open Square</a> : null}
                  {paid && payment.square_receipt_url ? <a href={payment.square_receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-full border border-emerald-400/30 px-3 py-2 text-[9px] uppercase tracking-[.12em] text-emerald-300"><ExternalLink className="h-3 w-3" />Receipt {payment.square_receipt_number ?? "Square"}</a> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--color-ink-line)] p-8 text-center"><div><h2 className="font-display text-2xl">No active queue entries</h2><p className="mt-3 text-sm text-[var(--color-bone-muted)]">{live ? "New walk-ins will appear here automatically." : "Apply the latest Supabase migration and enable the walk-in queue."}</p></div></div>}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-4"><p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-bone-muted)]">{label}</p><p className="font-display mt-2 text-3xl">{value}</p></div>;
}
