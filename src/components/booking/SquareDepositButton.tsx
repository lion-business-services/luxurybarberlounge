"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

export function SquareDepositButton({ reference, token, amountCents, status }: { reference: string; token: string; amountCents: number; status: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (amountCents <= 0 || status === "not_required") return null;
  if (status === "paid") return <p className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 text-sm text-emerald-100">Deposit paid.</p>;
  async function pay() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/booking/payment-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reference, token }) });
      const result = await response.json() as { ok?: boolean; url?: string; paid?: boolean; message?: string };
      if (!response.ok || !result.ok) { setMessage(result.message ?? "Square checkout is temporarily unavailable."); setBusy(false); return; }
      if (result.paid) { window.location.reload(); return; }
      if (result.url) { window.location.assign(result.url); return; }
      setMessage("Square checkout is temporarily unavailable."); setBusy(false);
    } catch {
      setMessage("Square checkout is temporarily unavailable."); setBusy(false);
    }
  }
  return <div className="mt-6 rounded-xl border border-[var(--color-brass)]/25 bg-black/15 p-5"><p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Amount due to confirm</p><p className="font-display mt-2 text-3xl">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100)}</p><p className="mt-2 text-xs leading-6 text-[var(--color-bone-muted)]">Full payment is required to confirm your appointment. A 4% service fee is added at checkout. Nothing further is due at the chair.</p><button type="button" disabled={busy} onClick={() => void pay()} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 text-[10px] tracking-[.16em] uppercase text-black disabled:opacity-50"><CreditCard className="h-4 w-4" />{busy ? "Opening Square..." : "Pay with Square"}</button>{message ? <p role="status" className="mt-3 text-xs text-amber-100">{message}</p> : null}</div>;
}
