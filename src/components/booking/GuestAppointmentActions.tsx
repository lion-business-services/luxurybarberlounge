"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GuestAppointmentActions({ reference, token, startsAt, status }: { reference: string; token: string; startsAt: string; status: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextTime, setNextTime] = useState(new Date(startsAt).toISOString().slice(0, 16));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const terminal = ["completed", "cancelled_by_client", "cancelled_by_business", "no_show", "declined", "expired", "failed"].includes(status);
  if (terminal) return <p className="mt-8 text-sm text-[var(--color-bone-muted)]">This appointment is {status.replaceAll("_", " ")} and cannot be changed online.</p>;
  async function change(action: "cancel" | "reschedule") {
    if (action === "cancel" && !window.confirm("Cancel this appointment?")) return;
    setBusy(true); setMessage("");
    const response = await fetch(`/api/booking/manage/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, startsAt: action === "reschedule" ? new Date(nextTime).toISOString() : undefined }) }).catch(() => null);
    const body = response ? await response.json().catch(() => null) as { ok?: boolean; message?: string } | null : null;
    setMessage(body?.message || (body?.ok ? "Appointment updated." : "The appointment could not be updated."));
    if (body?.ok) { setOpen(false); router.refresh(); }
    setBusy(false);
  }
  return <section className="mt-8 rounded-xl border border-[var(--color-ink-line)] p-5"><h2 className="font-display text-2xl">Manage appointment</h2><p className="mt-2 text-sm leading-6 text-[var(--color-bone-muted)]">Use this secure link to reschedule or cancel within the shop policy.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setOpen((value) => !value)} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-5 text-[9px] tracking-[.15em] uppercase">Reschedule</button><button type="button" disabled={busy} onClick={() => void change("cancel")} className="min-h-11 rounded-full border border-[var(--color-ink-line)] px-5 text-[9px] tracking-[.15em] uppercase disabled:opacity-40">Cancel</button></div>{open ? <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-2 text-[9px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">New date and time<input type="datetime-local" value={nextTime} onChange={(event) => setNextTime(event.target.value)} className="min-h-12 rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] px-4 text-sm normal-case tracking-normal" /></label><button type="button" disabled={busy} onClick={() => void change("reschedule")} className="min-h-12 rounded-full bg-[var(--color-brass)] px-5 text-[9px] tracking-[.15em] uppercase text-black disabled:opacity-40">Confirm change</button></div> : null}{message ? <p role="status" className="mt-4 text-xs text-[var(--color-bone-muted)]">{message}</p> : null}</section>;
}
