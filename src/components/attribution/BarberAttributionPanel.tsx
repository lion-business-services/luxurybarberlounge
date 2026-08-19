"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUp, LoaderCircle, RefreshCw } from "lucide-react";

type Claim = {
  id: string;
  client_email: string | null;
  client_phone: string | null;
  claim_type: string;
  status: string;
  explanation: string;
  requested_at: string;
};

type ClaimsResponse = {
  claims?: Claim[];
  claimableClients?: Array<{
    clientId: string; name: string; email: string | null; phone: string | null;
    lastVisit: string | null; declaredStatus: string | null; claimable: boolean;
    reason: string | null; barberName: string | null;
  }>;
  message?: string;
};

export function BarberAttributionPanel() {
  const [claims, setClaims] = useState<Claim[]>([]);
  type ClaimableClient = {
    clientId: string; name: string; email: string | null; phone: string | null;
    lastVisit: string | null; declaredStatus: string | null; claimable: boolean;
    reason: string | null; barberName: string | null;
  };
  const [clientOptions, setClientOptions] = useState<ClaimableClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
    setClientOptions(result.claimableClients ?? []);
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
        setClientOptions(result.claimableClients ?? []);
        return result.claims ?? [];
      })
      .then(setClaims)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "Claims could not be loaded.");
      });

    return () => controller.abort();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/attribution/claims", {
        method: "POST",
        body: new FormData(formElement),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "The claim could not be submitted.");
      }

      setMessage(
        "Claim submitted for owner review. You cannot edit the attribution directly.",
      );
      formElement.reset();
      await loadClaims();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The claim could not be submitted.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setMessage("");
    try {
      await loadClaims();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Claims could not be refreshed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">
          Independent Barber workspace
        </p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl">
          Client attribution claims
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-bone-muted)]">
          Every unresolved client-and-Barber pairing is SHOP. Submit documentary
          evidence for review. You cannot change attribution or locked calculations
          directly.
        </p>
      </header>

      <div className="grid gap-8 xl:grid-cols-[.8fr_1.2fr]">
        <form onSubmit={submit} className="portal-card space-y-4">
          <h2 className="font-display text-2xl">New claim</h2>
          <label>
            <span className="form-label">Claim type</span>
            <select name="claimType" className="form-control" required>
              <option value="pre_existing">Verified pre-existing client</option>
              <option value="personal_referral">Personal family/friend referral</option>
              <option value="referral_code">Registered personal referral code</option>
              <option value="approved_lead">Owner-approved Barber lead</option>
              <option value="late_claim">Late claim before first service</option>
            </select>
          </label>
          <label>
            <span className="form-label">Client</span>
            <select
              className="form-control"
              value={selectedClient}
              onChange={(event) => setSelectedClient(event.target.value)}
              required
            >
              <option value="">Select a client…</option>
              {clientOptions.map((client) => (
                <option
                  key={client.clientId || client.email || client.name}
                  value={client.clientId}
                  disabled={!client.claimable}
                >
                  {client.name}
                  {client.barberName ? ` · ${client.barberName}` : ""}
                  {client.claimable ? "" : "  — NEW CLIENT, cannot be claimed"}
                </option>
              ))}
            </select>
          </label>
          {(() => {
            const chosen = clientOptions.find((client) => client.clientId === selectedClient);
            if (!chosen) {
              return (
                <p className="text-xs text-[var(--color-bone-muted)]">
                  Clients who declared themselves new at booking are shop-generated and appear greyed out.
                </p>
              );
            }
            return (
              <>
                <input type="hidden" name="clientEmail" value={chosen.email ?? ""} />
                <input type="hidden" name="clientPhone" value={chosen.phone ?? ""} />
                {chosen.reason ? (
                  <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-100">
                    {chosen.reason}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--color-bone-muted)]">
                    {chosen.email ?? chosen.phone ?? "No contact on file"}
                    {chosen.lastVisit ? ` · last visit ${new Date(chosen.lastVisit).toLocaleDateString()}` : ""}
                  </p>
                )}
              </>
            );
          })()}
          <label>
            <span className="form-label">Prior service date</span>
            <input name="priorServiceDate" type="date" className="form-control" />
          </label>
          <label>
            <span className="form-label">Prior place of business</span>
            <input name="priorPlace" className="form-control" />
          </label>
          <label>
            <span className="form-label">Explanation</span>
            <textarea
              name="explanation"
              minLength={20}
              required
              className="form-control min-h-28"
            />
          </label>
          <label>
            <span className="form-label">Evidence type</span>
            <select name="evidenceType" className="form-control">
              <option value="appointment_record">Prior appointment record</option>
              <option value="pos_record">Prior POS record</option>
              <option value="booking_export">Booking-platform export</option>
              <option value="client_list">Prior client list</option>
              <option value="message_history">Dated message history</option>
              <option value="client_confirmation">Client written confirmation</option>
            </select>
          </label>
          <label>
            <span className="form-label">Evidence file</span>
            <input
              name="evidence"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
              className="form-control"
            />
          </label>
          <label className="flex items-start gap-3 text-xs leading-5 text-[var(--color-bone-muted)]">
            <input
              name="submittedBeforeService"
              value="true"
              type="checkbox"
              className="mt-1"
            />
            This claim is submitted before the client’s first service at the Lounge.
          </label>
          <button
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)] disabled:opacity-50"
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            Submit for review
          </button>
          {message ? (
            <p role="status" className="text-xs leading-5 text-[var(--color-bone-muted)]">
              {message}
            </p>
          ) : null}
        </form>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Claim history</h2>
            <button
              type="button"
              onClick={refresh}
              disabled={busy}
              className="inline-flex items-center gap-2 text-[10px] tracking-[.15em] uppercase text-[var(--color-brass)] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {claims.length ? (
              claims.map((claim) => (
                <article key={claim.id} className="portal-card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">
                        {claim.claim_type.replaceAll("_", " ")}
                      </p>
                      <h3 className="mt-2 font-display text-xl">
                        {claim.client_email || claim.client_phone || "Client reference"}
                      </h3>
                    </div>
                    <span className="rounded-full border border-[var(--color-ink-line)] px-3 py-1 text-[9px] uppercase">
                      {claim.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-[var(--color-bone-muted)]">
                    {claim.explanation}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--color-ink-line)] p-8 text-center text-sm text-[var(--color-bone-muted)]">
                No submitted claims.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
