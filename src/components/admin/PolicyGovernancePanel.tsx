"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Save, ShieldCheck } from "lucide-react";
import { commissionPolicyMeta, lockedCommissionRules, policyOpenItems, proposedCommissionRules, type PolicyRule } from "@/lib/policy/commissionPolicy";

function RuleCard({ rule, editable = false }: { rule: PolicyRule; editable?: boolean }) {
  const [initials, setInitials] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(decision: string) {
    setStatus("saving");
    const response = await fetch("/api/admin/policy/decision", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ruleKey: rule.key, decision, initials, answer }) });
    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <article className="rounded-xl border border-[var(--color-ink-line)] bg-[#0d0d0d] p-5">
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="font-display text-xl">{rule.label}</h3><p className="mt-2 text-xs leading-6 text-[var(--color-bone-muted)]">{rule.summary}</p></div>
        <span className={`rounded-full border px-3 py-1 text-[9px] tracking-[.14em] uppercase ${rule.state === "locked" ? "border-emerald-700/40 text-emerald-300" : rule.state === "open" ? "border-amber-700/40 text-amber-300" : "border-cyan-700/40 text-cyan-200"}`}>{rule.state}</span>
      </div>
      {rule.effectiveValue ? <p className="mt-4 text-sm text-[var(--color-brass)]">Effective value: {rule.effectiveValue}</p> : null}
      {editable ? (
        <div className="mt-5 grid gap-3">
          {rule.state === "open" ? <label><span className="form-label">Owner answer</span><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="form-control min-h-24" /></label> : null}
          <label><span className="form-label">Owner initials</span><input value={initials} onChange={(event) => setInitials(event.target.value)} className="form-control" maxLength={12} /></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => save("approved")} disabled={!initials.trim() || status === "saving"} className="rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)] disabled:opacity-50">Approve</button>
            <button type="button" onClick={() => save("deferred")} disabled={status === "saving"} className="rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] tracking-[.16em] uppercase">Defer</button>
            <button type="button" onClick={() => save("rejected")} disabled={status === "saving"} className="rounded-full border border-red-800/40 px-4 py-2 text-[9px] tracking-[.16em] uppercase text-red-200">Reject</button>
          </div>
          {status === "saved" ? <p className="text-xs text-emerald-300">Decision recorded in the policy audit trail.</p> : status === "error" ? <p className="text-xs text-red-300">The decision was not saved. Confirm Supabase migration 007 and owner access.</p> : null}
        </div>
      ) : null}
    </article>
  );
}

export function PolicyGovernancePanel() {
  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Owner policy governance</p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl">Attribution & commission policy</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-bone-muted)]">Rule Set v{commissionPolicyMeta.version}. Confirmed rules remain active. Proposed rules and open questions stay inactive until an owner decision is recorded and a future policy version is published.</p>
      </header>
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-700/35 bg-amber-950/15 p-4 text-xs leading-6 text-amber-100"><AlertTriangle className="mt-1 h-5 w-5 shrink-0" /><span>The policy identifies an unresolved worker-classification issue between booth rental and percentage commission. This system is an operating and calculation tool, not legal advice. Review the structure with qualified New Jersey counsel before the first statement.</span></div>
      <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-700/35 bg-amber-950/15 p-4 text-xs leading-6 text-amber-100"><AlertTriangle className="mt-1 h-5 w-5 shrink-0" /><span>The owner returned the seven commission-rule confirmation lines without initials. The unchanged defaults are loaded for calculation, but the owner should initial those lines before the first statement so the agreement has a clear record.</span></div>

      <section><div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="font-display text-2xl">Confirmed and locked defaults</h2></div><div className="grid gap-4 lg:grid-cols-2">{lockedCommissionRules.map((rule) => <RuleCard key={rule.key} rule={rule} />)}</div></section>
      <section className="mt-12"><div className="mb-4 flex items-center gap-2"><Clock3 className="h-5 w-5 text-cyan-200" /><h2 className="font-display text-2xl">Proposed determinations</h2></div><div className="grid gap-4 lg:grid-cols-2">{proposedCommissionRules.map((rule) => <RuleCard key={rule.key} rule={rule} editable />)}</div></section>
      <section className="mt-12"><div className="mb-4 flex items-center gap-2"><Save className="h-5 w-5 text-amber-300" /><h2 className="font-display text-2xl">Open owner decisions</h2></div><div className="grid gap-4 lg:grid-cols-2">{policyOpenItems.map((rule) => <RuleCard key={rule.key} rule={rule} editable />)}</div></section>
      <div className="mt-10 flex items-start gap-3 rounded-xl border border-emerald-700/25 bg-emerald-950/10 p-4 text-xs leading-6 text-[var(--color-bone-muted)]"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-300" /><span>Publishing a future policy version must be effective-dated and non-retroactive. Locked calculations are never rewritten. Any correction creates a separately dated Adjustment.</span></div>
    </div>
  );
}
