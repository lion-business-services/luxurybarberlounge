"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, RotateCcw, Webhook } from "lucide-react";
import { PortalHeader } from "@/components/portal/PortalUI";

type Event = { id: string; provider: string; provider_event_id: string; event_type: string; signature_valid: boolean; received_at: string; processing_status: string; processed_at: string | null; attempt_count: number; last_error: string | null };

export function AdminWebhooksPanel() {
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState("Loading verified webhook events...");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/webhooks", { cache: "no-store" });
    const data = await response.json().catch(() => null) as { ok?: boolean; message?: string; events?: Event[] } | null;
    if (!response.ok || !data?.ok) { setStatus(data?.message || "Webhook events could not be loaded."); return; }
    setEvents(data.events ?? []);
    setStatus(`${data.events?.length ?? 0} recent events. Payload contents remain server-only.`);
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/webhooks", { cache: "no-store" })
      .then((response) => Promise.all([response, response.json().catch(() => null)]))
      .then(([response, data]) => {
        if (!active) return;
        const payload = data as { ok?: boolean; message?: string; events?: Event[] } | null;
        if (!response.ok || !payload?.ok) { setStatus(payload?.message || "Webhook events could not be loaded."); return; }
        setEvents(payload.events ?? []);
        setStatus(`${payload.events?.length ?? 0} recent events. Payload contents remain server-only.`);
      });
    return () => { active = false; };
  }, []);

  async function action(actionName: "process" | "retry", eventId?: string) {
    setBusy(true);
    const response = await fetch("/api/admin/webhooks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: actionName, eventId }) });
    const data = await response.json().catch(() => null) as { ok?: boolean; message?: string; processed?: number; failed?: number; ignored?: number } | null;
    setStatus(response.ok && data?.ok ? actionName === "process" ? `Processed ${data.processed ?? 0}; failed ${data.failed ?? 0}; ignored ${data.ignored ?? 0}.` : "Event queued for safe retry." : data?.message || "Webhook action failed.");
    await load();
    setBusy(false);
  }

  return <>
    <PortalHeader eyebrow="Integration operations" title="Verified webhook inbox" copy="Square events are signature-checked, stored once, processed idempotently, and retained with attempt history for authorized recovery." actions={<div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void load()} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] tracking-[.18em] uppercase"><RefreshCw className="h-4 w-4" /> Refresh</button><button type="button" disabled={busy} onClick={() => void action("process")} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)]"><Webhook className="h-4 w-4" /> Process inbox</button></div>} />
    <p className="mb-6 rounded-xl border border-[var(--color-ink-line)] bg-white/[.02] px-4 py-3 text-xs text-[var(--color-bone-muted)]" aria-live="polite">{status}</p>
    <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Received</th><th>Type</th><th>Status</th><th>Attempts</th><th>Signature</th><th>Error</th><th>Action</th></tr></thead><tbody>{events.length ? events.map((event) => <tr key={event.id}><td>{new Date(event.received_at).toLocaleString()}</td><td><strong>{event.event_type}</strong><br/><span className="text-[10px] text-[var(--color-bone-muted)]">{event.provider_event_id}</span></td><td>{event.processing_status}</td><td>{event.attempt_count}</td><td>{event.signature_valid ? "Verified" : "Rejected"}</td><td>{event.last_error || "—"}</td><td>{["failed", "dead_letter", "ignored"].includes(event.processing_status) ? <button type="button" disabled={busy} onClick={() => void action("retry", event.id)} className="inline-flex items-center gap-2 text-[10px] tracking-[.15em] uppercase text-[var(--color-brass)]"><RotateCcw className="h-4 w-4" /> Retry</button> : "—"}</td></tr>) : <tr><td colSpan={7}>No webhook events are available.</td></tr>}</tbody></table></div>
  </>;
}
