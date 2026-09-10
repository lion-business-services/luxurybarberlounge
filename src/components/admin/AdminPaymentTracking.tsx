"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, RefreshCw, Search, WalletCards } from "lucide-react";

type PaymentRow = {
  id: string;
  source: "walk_in" | "appointment";
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  barberName: string;
  serviceName: string;
  serviceAt: string;
  paymentMethod: string;
  paymentStatus: string;
  appointmentStatus?: string | null;
  amountCents: number;
  tipCents: number;
  processingFeeCents: number;
  paidAt: string | null;
  receiptNumber: string | null;
  receiptUrl: string | null;
  reference: string;
  cardBrand?: string | null;
  purpose?: string | null;
};

type Payload = {
  ok: boolean;
  generatedAt?: string;
  walkIns: PaymentRow[];
  appointments: PaymentRow[];
  summary: { totalPaidCents: number; walkInPaidCount: number; appointmentPaidCount: number; pendingCount: number };
  message?: string;
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—";
const pretty = (value: string | null | undefined) => String(value ?? "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AdminPaymentTracking() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [tab, setTab] = useState<"walk_in" | "appointment">("walk_in");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/payment-tracking", { cache: "no-store" }).catch(() => null);
    const result = response ? await response.json().catch(() => null) as Payload | null : null;
    if (!response?.ok || !result?.ok) {
      setMessage(result?.message ?? "Payment tracking could not be loaded.");
      return;
    }
    setPayload(result);
    setMessage("");
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 10000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);

  const rows = useMemo(() => {
    const source = tab === "walk_in" ? payload?.walkIns ?? [] : payload?.appointments ?? [];
    const query = search.trim().toLowerCase();
    return source.filter((row) => {
      if (status !== "all" && row.paymentStatus !== status) return false;
      if (!query) return true;
      return [row.clientName, row.clientEmail, row.clientPhone, row.barberName, row.serviceName, row.reference, row.paymentMethod, row.paymentStatus]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [payload, search, status, tab]);

  if (!payload) return <div className="rounded-2xl border border-[var(--color-ink-line)] p-8 text-sm text-[var(--color-bone-muted)]">Loading live payment records…</div>;

  return <div className="grid gap-6">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[10px] uppercase tracking-[.24em] text-[var(--color-brass)]">Financial operations</p><h1 className="font-display mt-2 text-4xl sm:text-5xl">Payment Tracking</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">A dedicated audit view for walk-in and appointment payments, separate from commissions. Records refresh automatically every 10 seconds.</p></div>
      <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] uppercase tracking-[.14em]"><RefreshCw className="h-4 w-4" />Refresh</button>
    </header>

    <section className="grid gap-3 md:grid-cols-4">
      <Metric label="Paid tracked" value={money(payload.summary.totalPaidCents)} />
      <Metric label="Walk-ins paid" value={String(payload.summary.walkInPaidCount)} />
      <Metric label="Appointments paid" value={String(payload.summary.appointmentPaidCount)} />
      <Metric label="Pending payments" value={String(payload.summary.pendingCount)} />
    </section>

    <section className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab("walk_in")} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-[10px] uppercase tracking-[.14em] ${tab === "walk_in" ? "bg-[var(--color-brass)] text-black" : "border border-[var(--color-ink-line)]"}`}><WalletCards className="h-4 w-4" />Walk-ins</button>
          <button type="button" onClick={() => setTab("appointment")} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-[10px] uppercase tracking-[.14em] ${tab === "appointment" ? "bg-[var(--color-brass)] text-black" : "border border-[var(--color-ink-line)]"}`}><CreditCard className="h-4 w-4" />Appointments</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_170px]">
          <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Search<span className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-12 w-full rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] pl-10 pr-4 text-sm normal-case tracking-normal" placeholder="Client, barber, service, reference" /></span></label>
          <label className="grid gap-2 text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Payment status<select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal"><option value="all">All</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="refunded">Refunded</option><option value="voided">Voided</option><option value="unmatched">Unmatched</option></select></label>
        </div>
      </div>
    </section>

    {message ? <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 text-sm text-red-100">{message}</div> : null}

    <section className="overflow-hidden rounded-2xl border border-[var(--color-ink-line)] bg-white/[.015]">
      {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="border-b border-[var(--color-ink-line)] bg-white/[.025] text-[9px] uppercase tracking-[.14em] text-[var(--color-brass)]"><tr><th className="px-5 py-4">Client</th><th className="px-5 py-4">Service / Barber</th><th className="px-5 py-4">Service time</th><th className="px-5 py-4">Payment</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Paid at</th><th className="px-5 py-4">Reference</th><th className="px-5 py-4">Receipt</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-[var(--color-ink-line)] last:border-0 align-top"><td className="px-5 py-4"><strong>{row.clientName}</strong><p className="mt-1 text-xs text-[var(--color-bone-muted)]">{row.clientPhone ?? "No phone"}</p><p className="mt-1 text-xs text-[var(--color-bone-muted)]">{row.clientEmail ?? "No email"}</p></td><td className="px-5 py-4"><strong className="font-medium">{pretty(row.serviceName)}</strong><p className="mt-1 text-xs text-[var(--color-bone-muted)]">{row.barberName}</p></td><td className="px-5 py-4">{dateTime(row.serviceAt)}{row.appointmentStatus ? <p className="mt-1 text-[10px] uppercase tracking-[.12em] text-[var(--color-bone-muted)]">{pretty(row.appointmentStatus)}</p> : null}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[.12em] ${row.paymentStatus === "paid" ? "border-emerald-400/30 text-emerald-300" : "border-[var(--color-brass)]/30 text-[var(--color-brass)]"}`}>{pretty(row.paymentStatus)}</span><p className="mt-2 text-xs text-[var(--color-bone-muted)]">{pretty(row.paymentMethod)}{row.cardBrand ? ` · ${row.cardBrand}` : ""}</p></td><td className="px-5 py-4"><strong>{money(row.amountCents)}</strong>{row.tipCents ? <p className="mt-1 text-xs text-[var(--color-bone-muted)]">Tip {money(row.tipCents)}</p> : null}</td><td className="px-5 py-4">{dateTime(row.paidAt)}</td><td className="px-5 py-4 font-mono text-xs">{row.reference}</td><td className="px-5 py-4">{row.receiptUrl ? <a href={row.receiptUrl} target="_blank" rel="noreferrer" className="text-[var(--color-brass)] underline underline-offset-4">Open receipt</a> : <span className="text-xs text-[var(--color-bone-muted)]">{row.receiptNumber ? `ID ${row.receiptNumber}` : "—"}</span>}</td></tr>)}</tbody></table></div> : <div className="p-10 text-center text-sm text-[var(--color-bone-muted)]">No payment records match this view.</div>}
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-5"><p className="text-[9px] uppercase tracking-[.15em] text-[var(--color-bone-muted)]">{label}</p><p className="font-display mt-2 text-3xl">{value}</p></article>;
}
