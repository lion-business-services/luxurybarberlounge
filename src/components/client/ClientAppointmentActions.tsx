"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClientAppointmentActions({ appointmentId, canChange, startsAt }: { appointmentId: string; canChange: boolean; startsAt: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextTime, setNextTime] = useState(startsAt ? new Date(startsAt).toISOString().slice(0, 16) : "");
  const [busy, setBusy] = useState<"cancel" | "reschedule" | null>(null);
  const [message, setMessage] = useState("");

  async function cancel() {
    if (!window.confirm("Cancel this appointment? The provider cancellation policy still applies.")) return;
    setBusy("cancel"); setMessage("");
    const response = await fetch("/api/client/appointments", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ appointmentId }) }).catch(() => null);
    const body = response ? await response.json().catch(() => null) as { ok?: boolean; message?: string } | null : null;
    if (!response?.ok || !body?.ok) setMessage(body?.message || "The appointment could not be cancelled online. Contact the lounge.");
    else { setMessage("Your appointment was cancelled."); router.refresh(); }
    setBusy(null);
  }

  async function reschedule() {
    const date = new Date(nextTime);
    if (!nextTime || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) { setMessage("Choose a future date and time."); return; }
    setBusy("reschedule"); setMessage("");
    const response = await fetch("/api/client/appointments", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ appointmentId, startsAt: date.toISOString() }) }).catch(() => null);
    const body = response ? await response.json().catch(() => null) as { ok?: boolean; message?: string } | null : null;
    if (!response?.ok || !body?.ok) setMessage(body?.message || "The appointment could not be rescheduled online. Contact the lounge.");
    else { setMessage("Your appointment was rescheduled."); setOpen(false); router.refresh(); }
    setBusy(null);
  }

  if (!canChange) return <p className="text-xs text-[var(--color-bone-muted)]">Completed and historical appointments cannot be changed.</p>;
  return <div className="mt-5 rounded-xl border border-[var(--color-ink-line)] bg-black/20 p-4">
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Reschedule</button><button type="button" disabled={busy !== null} onClick={() => void cancel()} className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase disabled:opacity-50">{busy === "cancel" ? "Cancelling" : "Cancel appointment"}</button></div>
    {open ? <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-2 text-[9px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">Requested date and time<input className="rounded-xl border border-[var(--color-ink-line)] bg-[#111] px-4 py-3 text-sm normal-case tracking-normal text-[var(--color-bone)]" type="datetime-local" value={nextTime} onChange={(event) => setNextTime(event.target.value)} /></label><button type="button" disabled={busy !== null} onClick={() => void reschedule()} className="min-h-12 rounded-full bg-[var(--color-brass)] px-5 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)] disabled:opacity-50">{busy === "reschedule" ? "Updating" : "Confirm change"}</button></div> : null}
    {message ? <p role="status" className="mt-3 text-xs text-[var(--color-bone-muted)]">{message}</p> : null}
  </div>;
}
