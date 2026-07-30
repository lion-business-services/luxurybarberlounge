"use client";

import { useState } from "react";

export function ClientOrderSupport({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setStatus("Sending your request...");
    const response = await fetch("/api/client/order-support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, subject: "Question about my order", message }) }).catch(() => null);
    const data = response ? await response.json().catch(() => null) as { ok?: boolean; message?: string } | null : null;
    if (!response?.ok || !data?.ok) setStatus(data?.message || "The request could not be sent. Call the lounge for assistance.");
    else { setStatus("Your request was sent to the lounge."); setMessage(""); setOpen(false); }
    setBusy(false);
  }
  return <div>
    <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-[var(--color-brass)] px-4 py-2.5 text-[9px] tracking-[.14em] uppercase text-[var(--color-ink)]">Order support</button>
    {open ? <div className="mt-4 rounded-xl border border-[var(--color-ink-line)] bg-black/20 p-4"><label><span className="form-label">How can we help?</span><textarea className="form-control min-h-28" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1200} /></label><div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" disabled={busy || message.trim().length < 5} onClick={() => void submit()} className="rounded-full bg-[var(--color-brass)] px-4 py-2.5 text-[9px] tracking-[.14em] uppercase text-[var(--color-ink)] disabled:opacity-50">{busy ? "Sending" : "Send request"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-[var(--color-ink-line)] px-4 py-2.5 text-[9px] tracking-[.14em] uppercase">Cancel</button></div></div> : null}
    {status ? <p role="status" className="mt-2 text-xs text-[var(--color-bone-muted)]">{status}</p> : null}
  </div>;
}
