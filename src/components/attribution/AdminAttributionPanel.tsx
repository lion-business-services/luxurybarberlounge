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

type ClaimsResponse = {
  claims?: Claim[];
  message?: string;
};

export function AdminAttributionPanel() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [message, setMessage] = useState("");
  const [pendingDecision, setPendingDecision] = useState<{ claimId: string; decision: string } | null>(null);
  const [reason, setReason] = useState("");

  const loadClaims = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/attribution/claims", {
      cache: "no-store",
      signal,
    });
    const result = (await response.json()) as ClaimsResponse;

    if (!response.ok) {
      throw new Error(result.message ?? "Claims could not be loaded.");
    }

    setClaims(result.claims ?? []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/attribution/claims", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as ClaimsResponse;
        if (!response.ok) {
          throw new Error(result.message ?? "Claims could not be loaded.");
        }
        return result.claims ?? [];
      })
      .then(setClaims)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "Claims could not be loaded.");
      });

    return () => controller.abort();
  }, []);

  async function submitDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingDecision || reason.trim().length < 10) {
      setMessage("Provide at least 10 characters explaining this decision.");
      return;
    }

    const response = await fetch("/api/admin/attribution/decision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        claimId: pendingDecision.claimId,
        decision: pendingDecision.decision,
        reason: reason.trim(),
      }),
    });
    const result = (await response.json()) as { message?: string };

    setMessage(
      response.ok
        ? "Decision recorded and audited."
        : (result.message ?? "Decision failed."),
    );

    if (response.ok) {
      setPendingDecision(null);
      setReason("");
      try {
        await loadClaims();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Claims could not be refreshed.");
      }
    }
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">
          Attribution governance
        </p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl">
          Claims &amp; evidence review
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-bone-muted)]">
          SHOP is the default. BARBER attribution is created only after approved
          evidence and an auditable written decision.
        </p>
      </header>

      {message ? (
        <p
          role="status"
          className="mb-5 rounded-lg border border-[var(--color-brass)]/20 p-3 text-xs"
        >
          {message}
        </p>
      ) : null}

      <div className="space-y-4">
        {claims.map((claim) => (
          <article key={claim.id} className="portal-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">
                  {claim.claim_type.replaceAll("_", " ")} ·{" "}
                  {claim.status.replaceAll("_", " ")}
                </p>
                <h2 className="font-display mt-2 text-2xl">
                  {claim.client_email || claim.client_phone || "Client reference"}
                </h2>
                <p className="mt-3 max-w-3xl text-xs leading-6 text-[var(--color-bone-muted)]">
                  {claim.explanation}
                </p>
              </div>

              {["submitted", "under_review", "needs_information"].includes(
                claim.status,
              ) ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setPendingDecision({ claimId: claim.id, decision: "approved" }); setReason(""); setMessage(""); }}
                    className="rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)]"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPendingDecision({ claimId: claim.id, decision: "needs_information" }); setReason(""); setMessage(""); }}
                    className="rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] uppercase"
                  >
                    Need info
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPendingDecision({ claimId: claim.id, decision: "rejected" }); setReason(""); setMessage(""); }}
                    className="rounded-full border border-red-800/40 px-4 py-2 text-[9px] uppercase text-red-200"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
            {pendingDecision?.claimId === claim.id ? (
              <form onSubmit={submitDecision} className="mt-5 grid gap-4 rounded-xl border border-[var(--color-brass)]/25 bg-black/20 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <label className="grid gap-2 text-xs">
                  <span className="uppercase tracking-[.16em] text-[var(--color-brass)]">Written reason for {pendingDecision.decision.replaceAll("_", " ")}</span>
                  <textarea
                    autoFocus
                    required
                    minLength={10}
                    maxLength={2000}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="min-h-24 rounded-lg border border-[var(--color-ink-line)] bg-[var(--color-ink)] px-3 py-3"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="rounded-full bg-[var(--color-brass)] px-4 py-3 text-[9px] uppercase text-[var(--color-ink)]">Record decision</button>
                  <button type="button" onClick={() => setPendingDecision(null)} className="rounded-full border border-[var(--color-ink-line)] px-4 py-3 text-[9px] uppercase">Cancel</button>
                </div>
              </form>
            ) : null}
          </article>
        ))}

        {!claims.length ? (
          <div className="rounded-xl border border-dashed border-[var(--color-ink-line)] p-8 text-center text-[var(--color-bone-muted)]">
            No claims awaiting review.
          </div>
        ) : null}
      </div>
    </div>
  );
}
