"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { PortalHeader } from "@/components/portal/PortalUI";

type RequestRow = { id: string; case_number: string; category: string; status: string; subject: string; created_at: string; resolved_at: string | null };

export function ClientPrivacyPanel() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [status, setStatus] = useState("Loading privacy request history...");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/account/requests", { cache: "no-store" });
    const data = await response.json().catch(() => null) as { ok?: boolean; message?: string; requests?: RequestRow[] } | null;
    if (!response.ok || !data?.ok) { setStatus(data?.message || "Privacy requests could not be loaded."); return; }
    setRequests(data.requests ?? []); setStatus("Requests are reviewed by an authorized administrator. Account deletion is never immediate or irreversible from this screen.");
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/account/requests", { cache: "no-store" }).then((response) => Promise.all([response, response.json().catch(() => null)])).then(([response, data]) => {
      if (!active) return;
      const payload = data as { ok?: boolean; message?: string; requests?: RequestRow[] } | null;
      if (!response.ok || !payload?.ok) { setStatus(payload?.message || "Privacy requests could not be loaded."); return; }
      setRequests(payload.requests ?? []); setStatus("Requests are reviewed by an authorized administrator. Account deletion is never immediate or irreversible from this screen.");
    });
    return () => { active = false; };
  }, []);
  async function submit(type: "data_export" | "account_deletion") {
    if (type === "account_deletion" && !window.confirm("Submit an account deletion request for authorized review? Existing legal and financial records may require retention.")) return;
    setBusy(true); setStatus("Recording your request...");
    const response = await fetch("/api/account/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type }) });
    const data = await response.json().catch(() => null) as { ok?: boolean; message?: string; caseNumber?: string; duplicate?: boolean } | null;
    setStatus(response.ok && data?.ok ? `${data.duplicate ? "An open request already exists" : "Request submitted"}: ${data.caseNumber}.` : data?.message || "The request could not be submitted.");
    await load(); setBusy(false);
  }
  return <>
    <PortalHeader eyebrow="Privacy and consent" title="Your data controls" copy="Request a portable copy of your client data or ask the lounge to review account deletion. Requests are identity-verified, auditable, and handled without silently deleting records that must be retained." />
    <p className="mb-6 rounded-xl border border-[var(--color-ink-line)] bg-white/[.02] px-4 py-3 text-xs text-[var(--color-bone-muted)]" aria-live="polite">{status}</p>
    <div className="grid gap-5 md:grid-cols-2"><article className="portal-card"><Download className="h-6 w-6 text-[var(--color-brass)]" /><h2 className="font-display mt-4 text-2xl">Request data export</h2><p className="mt-3 text-sm leading-6 text-[var(--color-bone-muted)]">Request a copy of the client profile, preferences, appointments, consents, and portal records the lounge is authorized to provide.</p><button type="button" disabled={busy} onClick={() => void submit("data_export")} className="mt-6 rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)] disabled:opacity-50">Request export</button></article><article className="portal-card"><Trash2 className="h-6 w-6 text-[var(--color-brass)]" /><h2 className="font-display mt-4 text-2xl">Request account deletion</h2><p className="mt-3 text-sm leading-6 text-[var(--color-bone-muted)]">Start an authorized review. Transaction, tax, dispute, consent, and audit records may remain where retention is legally or operationally required.</p><button type="button" disabled={busy} onClick={() => void submit("account_deletion")} className="mt-6 rounded-full border border-[var(--color-ink-line)] px-6 py-3 text-[10px] tracking-[.18em] uppercase disabled:opacity-50">Request review</button></article></div>
    <section className="portal-card mt-8"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[var(--color-brass)]" /><h2 className="font-display text-2xl">Request history</h2></div><div className="mt-5 space-y-3">{requests.length ? requests.map((item) => <article key={item.id} className="rounded-lg border border-[var(--color-ink-line)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{item.subject}</strong><span className="text-[9px] tracking-[.15em] uppercase text-[var(--color-brass)]">{item.status}</span></div><p className="mt-2 text-xs text-[var(--color-bone-muted)]">{item.case_number} · {new Date(item.created_at).toLocaleString()}</p></article>) : <p className="text-sm text-[var(--color-bone-muted)]">No privacy requests have been submitted.</p>}</div></section>
  </>;
}
