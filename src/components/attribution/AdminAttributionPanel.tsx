"use client";

import { useCallback, useEffect, useState } from "react";

type Claim = {
  id: string;
  barber_user_id: string;
  client_email: string | null;
  client_phone: string | null;
  claim_type: string;
  status: string;
  explanation: string;
  requested_at: string;
};

type IntegrityFlag = {
  barberUserId: string;
  barberName: string;
  preExistingClaims: number;
  newClients: number;
  ratio: number;
  threshold: number;
  settlementWeekStart: string;
};

type ClaimsResponse = {
  claims?: Claim[];
  integrityFlags?: IntegrityFlag[];
  message?: string;
};

function statusLabel(value: string) {
  if (value === "under_review") return "Under review";
  if (value === "needs_information") return "More information needed";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function claimTypeLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("barber")) return "Barber credit request";
  if (normalized.includes("shop")) return "Shop credit";
  return "Credit request";
}

export function AdminAttributionPanel() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [reviewFlags, setReviewFlags] = useState<IntegrityFlag[]>([]);
  const [message, setMessage] = useState("");
  const [pendingDecision, setPendingDecision] = useState<{ claimId: string; decision: string } | null>(null);
  const [reason, setReason] = useState("");

  const loadClaims = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/attribution/claims", { cache: "no-store", signal });
    const result = (await response.json()) as ClaimsResponse;
    if (!response.ok) throw new Error("Referral credit requests could not be loaded.");
    setClaims(result.claims ?? []);
    setReviewFlags(result.integrityFlags ?? []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadClaims(controller.signal).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Referral credit requests could not be loaded. Please refresh and try again.");
    });
    return () => controller.abort();
  }, [loadClaims]);

  async function submitDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingDecision || reason.trim().length < 10) {
      setMessage("Please add a short reason for this decision.");
      return;
    }

    const response = await fetch("/api/admin/attribution/decision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ claimId: pendingDecision.claimId, decision: pendingDecision.decision, reason: reason.trim() }),
    });

    setMessage(response.ok ? "Decision saved." : "The decision could not be saved. Please try again.");

    if (response.ok) {
      setPendingDecision(null);
      setReason("");
      try {
        await loadClaims();
      } catch {
        setMessage("Decision saved. Refresh the page to update the list.");
      }
    }
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Commission credit</p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl">Referral credit requests</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-bone-muted)]">Review requests for barber referral credit and approve them when the client information supports the request.</p>
      </header>

      {message ? <p role="status" className="mb-5 rounded-lg border border-[var(--color-brass)]/20 p-3 text-xs">{message}</p> : null}

      {reviewFlags.length ? (
        <div className="mb-6 grid gap-3">
          {reviewFlags.map((flag) => (
            <article key={flag.barberUserId} className="rounded-xl border border-amber-700/35 bg-amber-950/15 p-4 text-xs leading-6 text-amber-100">
              <strong>{flag.barberName}: extra review recommended.</strong>{" "}
              There are {flag.preExistingClaims} returning-client credit request{flag.preExistingClaims === 1 ? "" : "s"} and {flag.newClients} new client{flag.newClients === 1 ? "" : "s"} in the current weekly review period. Please check the client details before approving additional credit.
            </article>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {claims.map((claim) => (
          <article key={claim.id} className="portal-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">{claimTypeLabel(claim.claim_type)} · {statusLabel(claim.status)}</p>
                <h2 className="font-display mt-2 text-2xl">{claim.client_email || claim.client_phone || "Client"}</h2>
                <p className="mt-3 max-w-3xl text-xs leading-6 text-[var(--color-bone-muted)]">{claim.explanation}</p>
              </div>

              {["submitted", "under_review", "needs_information"].includes(claim.status) ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setPendingDecision({ claimId: claim.id, decision: "approved" }); setReason(""); setMessage(""); }} className="rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)]">Approve</button>
                  <button type="button" onClick={() => { setPendingDecision({ claimId: claim.id, decision: "needs_information" }); setReason(""); setMessage(""); }} className="rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] uppercase">Need info</button>
                  <button type="button" onClick={() => { setPendingDecision({ claimId: claim.id, decision: "rejected" }); setReason(""); setMessage(""); }} className="rounded-full border border-red-800/40 px-4 py-2 text-[9px] uppercase text-red-200">Reject</button>
                </div>
              ) : null}
            </div>

            {pendingDecision?.claimId === claim.id ? (
              <form onSubmit={submitDecision} className="mt-5 grid gap-4 rounded-xl border border-[var(--color-brass)]/25 bg-black/20 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <label className="grid gap-2 text-xs">
                  <span className="uppercase tracking-[.16em] text-[var(--color-brass)]">Reason for {statusLabel(pendingDecision.decision)}</span>
                  <textarea autoFocus required minLength={10} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 rounded-lg border border-[var(--color-ink-line)] bg-[var(--color-ink)] px-3 py-3" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="rounded-full bg-[var(--color-brass)] px-4 py-3 text-[9px] uppercase text-[var(--color-ink)]">Save decision</button>
                  <button type="button" onClick={() => setPendingDecision(null)} className="rounded-full border border-[var(--color-ink-line)] px-4 py-3 text-[9px] uppercase">Cancel</button>
                </div>
              </form>
            ) : null}
          </article>
        ))}

        {!claims.length ? <div className="rounded-xl border border-dashed border-[var(--color-ink-line)] p-8 text-center text-[var(--color-bone-muted)]">No referral credit requests are waiting for review.</div> : null}
      </div>
    </div>
  );
}
