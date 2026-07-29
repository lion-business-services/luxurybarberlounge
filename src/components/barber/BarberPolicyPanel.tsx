"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, ShieldAlert } from "lucide-react";
import { PortalHeader } from "@/components/portal/PortalUI";

type Policy = { id: string; policy_key: string; version: string; title: string; effective_from: string | null; status: string; published_at: string | null };
type Ack = { policy_version_id: string; acknowledged_at: string; signature_name: string | null };

export function BarberPolicyPanel() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<Ack[]>([]);
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState("Loading policy versions...");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/policy/acknowledgements", { cache: "no-store" }).then((response) => Promise.all([response, response.json().catch(() => null)])).then(([response, data]) => {
      if (!active) return;
      const payload = data as { ok?: boolean; message?: string; policies?: Policy[]; acknowledgements?: Ack[] } | null;
      if (!response.ok || !payload?.ok) { setStatus(payload?.message || "Policies could not be loaded."); return; }
      setPolicies(payload.policies ?? []); setAcknowledgements(payload.acknowledgements ?? []); setStatus("Only owner-approved or published versions can be acknowledged. Draft and proposed terms remain non-operative.");
    });
    return () => { active = false; };
  }, []);
  async function acknowledge(policy: Policy) {
    setBusy(true); setStatus("Recording acknowledgement...");
    const response = await fetch("/api/policy/acknowledgements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ policyVersionId: policy.id, signatureName: signature, acknowledgement: true }) });
    const data = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
    if (!response.ok || !data?.ok) setStatus(data?.message || "Acknowledgement failed.");
    else { setAcknowledgements((current) => [...current.filter((item) => item.policy_version_id !== policy.id), { policy_version_id: policy.id, acknowledged_at: new Date().toISOString(), signature_name: signature }]); setStatus("Policy acknowledgement recorded."); }
    setBusy(false);
  }
  return <>
    <PortalHeader eyebrow="Independent Barber resources" title="Policies and acknowledgements" copy="Review the effective rule version, distinguish confirmed rules from proposed terms, and preserve an auditable acknowledgement without changing historical calculations." />
    <p className="mb-6 rounded-xl border border-[var(--color-ink-line)] bg-white/[.02] px-4 py-3 text-xs text-[var(--color-bone-muted)]" aria-live="polite">{status}</p>
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-700/30 bg-amber-950/10 px-4 py-3 text-xs leading-5 text-amber-100"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>The operating structure and proposed economic terms require owner approval and legal review. This portal is an operating record, not legal advice.</span></div>
    <div className="space-y-4">{policies.map((policy) => { const ack = acknowledgements.find((item) => item.policy_version_id === policy.id); const canAcknowledge = ["approved", "published"].includes(policy.status); return <article key={policy.id} className="portal-card"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-3"><BookOpenCheck className="h-5 w-5 text-[var(--color-brass)]" /><h2 className="font-display text-2xl">{policy.title}</h2></div><p className="mt-3 text-xs tracking-[.14em] uppercase text-[var(--color-brass)]">Version {policy.version} · {policy.status.replaceAll("_", " ")}</p><p className="mt-3 text-sm text-[var(--color-bone-muted)]">Effective {policy.effective_from ? new Date(policy.effective_from).toLocaleDateString() : "after owner publication"}.</p></div>{ack ? <div className="rounded-lg border border-emerald-700/30 px-4 py-3 text-xs text-emerald-100">Acknowledged {new Date(ack.acknowledged_at).toLocaleString()}<br/>{ack.signature_name}</div> : canAcknowledge ? <div className="flex flex-col gap-3 sm:flex-row"><label><span className="form-label">Signature name</span><input className="form-control min-w-64" value={signature} onChange={(event) => setSignature(event.target.value)} /></label><button type="button" disabled={busy || signature.trim().length < 2} onClick={() => void acknowledge(policy)} className="self-end rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)] disabled:opacity-50">Acknowledge</button></div> : <span className="rounded-full border border-amber-700/30 px-4 py-2 text-[9px] tracking-[.15em] uppercase text-amber-100">Awaiting owner approval</span>}</div></article>; })}</div>
  </>;
}
