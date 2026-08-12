"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";

type Statement = {
  id: string;
  barber_user_id: string;
  barber_name?: string;
  gross_basis_cents: number;
  tips_cents: number;
  adjustments_cents: number;
  refunds_cents: number;
  final_amount_cents: number;
  status: string;
  created_at: string;
};

type Calculation = {
  id: string;
  barber_user_id: string;
  barber_name?: string;
  attribution_type: string;
  attribution_source: string;
  gross_service_cents: number;
  discount_cents: number;
  tip_cents: number;
  eligible_basis_cents: number;
  barber_rate: number;
  barber_amount_cents: number;
  status: string;
  calculated_at: string;
};

type Dispute = {
  id: string;
  calculation_id: string;
  barber_name?: string;
  reason_code: string;
  explanation: string;
  status: string;
  created_at: string;
};

type StatementsResponse = {
  statements?: Statement[];
  calculations?: Calculation[];
  disputes?: Dispute[];
  message?: string;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

export function CommissionWorkspace({ role }: { role: "barber" | "admin" }) {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [message, setMessage] = useState("");

  const applyResponse = useCallback((result: StatementsResponse) => {
    setStatements(result.statements ?? []);
    setCalculations(result.calculations ?? []);
    setDisputes(result.disputes ?? []);
  }, []);

  const loadRecords = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/commissions/statements", {
      cache: "no-store",
      signal,
    });
    const result = (await response.json()) as StatementsResponse;

    if (!response.ok) {
      throw new Error(result.message ?? "Records could not be loaded.");
    }

    applyResponse(result);
  }, [applyResponse]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/commissions/statements", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as StatementsResponse;
        if (!response.ok) {
          throw new Error(result.message ?? "Records could not be loaded.");
        }
        return result;
      })
      .then(applyResponse)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "Records could not be loaded.");
      });

    return () => controller.abort();
  }, [applyResponse]);

  const totals = useMemo(
    () => statements.reduce((sum, item) => sum + item.final_amount_cents, 0),
    [statements],
  );

  const latestStatementsByBarber = useMemo(() => {
    const latest = new Map<string, Statement>();
    for (const statement of statements) {
      if (!latest.has(statement.barber_user_id)) latest.set(statement.barber_user_id, statement);
    }
    return [...latest.values()];
  }, [statements]);

  async function refresh() {
    setMessage("");
    try {
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Records could not be refreshed.");
    }
  }


  async function runReconciliation() {
    setMessage("Updating calculated amounts from confirmed Square records...");
    const response = await fetch("/api/commissions/statements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "run_reconciliation" }),
    });
    const result = await response.json() as { message?: string; result?: { calculated?: number; exceptions?: number; statementsPrepared?: number } };
    if (!response.ok) {
      setMessage(result.message ?? "Calculated amounts could not be updated.");
      return;
    }
    const summary = result.result;
    setMessage(`Updated ${summary?.calculated ?? 0} calculation lines and ${summary?.statementsPrepared ?? 0} barber statements${summary?.exceptions ? `; ${summary.exceptions} item(s) need review` : ""}.`);
    await refresh();
  }

  function exportCsv() {
    const rows = [
      [
        ...(role === "admin" ? ["Barber"] : []),
        "Date",
        "Attribution",
        "Source",
        "Commission Basis",
        "Tips",
        "Barber Rate",
        "Calculated Amount",
        "Status",
      ],
      ...calculations.map((item) => [
        ...(role === "admin" ? [item.barber_name ?? "Unlinked barber"] : []),
        item.calculated_at,
        item.attribution_type,
        item.attribution_source,
        (item.eligible_basis_cents / 100).toFixed(2),
        (item.tip_cents / 100).toFixed(2),
        String(item.barber_rate),
        (item.barber_amount_cents / 100).toFixed(2),
        item.status,
      ]),
    ];

    const blob = new Blob(
      [
        rows
          .map((row) =>
            row
              .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
              .join(","),
          )
          .join("\n"),
      ],
      { type: "text/csv" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "luxury-barber-lounge-statements.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">
            {role === "barber" ? "Independent barber statements" : "Weekly barber amounts"}
          </p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl">
            {role === "barber" ? "My calculated amounts" : "Barber pay summary"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-bone-muted)]">
            {role === "barber"
              ? "Review service amounts, tips, and adjustments here. Under the confirmed rule, disputes must be sent to the owner by SMS within 24 hours. Statements report amounts only and do not move funds."
              : "Confirmed Square payments are matched to the barber and policy automatically. Review exceptions, then pay each barber manually by the approved method."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role === "admin" ? (
            <button
              type="button"
              onClick={() => void runReconciliation()}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)]"
            >
              <RefreshCw className="h-4 w-4" />
              Update amounts
            </button>
          ) : null}
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] uppercase"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] uppercase"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)]"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
        </div>
      </header>

      {message ? (
        <p
          role="status"
          className="mb-5 rounded-lg border border-[var(--color-brass)]/20 p-3 text-xs"
        >
          {message}
        </p>
      ) : null}

      <div className="portal-grid">
        <article className="portal-card col-span-3">
          <p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">
            Statements
          </p>
          <p className="metric-value mt-3">{statements.length}</p>
        </article>
        <article className="portal-card col-span-3">
          <p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">
            Reported total
          </p>
          <p className="metric-value mt-3">{money(totals)}</p>
        </article>
        <article className="portal-card col-span-3">
          <p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">
            Open disputes
          </p>
          <p className="metric-value mt-3">
            {
              disputes.filter(
                (item) =>
                  !["denied", "approved", "closed", "withdrawn"].includes(
                    item.status,
                  ),
              ).length
            }
          </p>
        </article>
      </div>

      {role === "admin" ? (
        <section className="mt-8">
          <h2 className="font-display mb-4 text-2xl">Latest statement by barber</h2>
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead><tr><th>Barber</th><th>Commission basis</th><th>Tips</th><th>Adjustments</th><th>Final amount</th><th>Status</th></tr></thead>
              <tbody>
                {latestStatementsByBarber.map((statement) => <tr key={statement.id}><td>{statement.barber_name ?? "Unlinked barber"}</td><td>{money(statement.gross_basis_cents)}</td><td>{money(statement.tips_cents)}</td><td>{money(statement.adjustments_cents)}</td><td><strong>{money(statement.final_amount_cents)}</strong></td><td>{statement.status}</td></tr>)}
                {!latestStatementsByBarber.length ? <tr><td colSpan={6}>No generated barber statements yet. Update amounts after Square synchronization is connected.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display mb-4 text-2xl">Statement lines</h2>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                {role === "admin" ? <th>Barber</th> : null}
                <th>Date</th>
                <th>Attribution</th>
                <th>Basis</th>
                <th>Tips</th>
                <th>Rate</th>
                <th>Calculated Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {calculations.map((item) => (
                <tr key={item.id}>
                  {role === "admin" ? <td>{item.barber_name ?? "Unlinked barber"}</td> : null}
                  <td>{new Date(item.calculated_at).toLocaleDateString()}</td>
                  <td>{item.attribution_type}</td>
                  <td>{money(item.eligible_basis_cents)}</td>
                  <td>{money(item.tip_cents)}</td>
                  <td>{Math.round(Number(item.barber_rate) * 100)}%</td>
                  <td>{money(item.barber_amount_cents)}</td>
                  <td>{item.status}</td>
                  <td>
                    {role === "barber" && !["locked", "paid", "voided"].includes(item.status)
                      ? "SMS owner within 24h"
                      : "—"}
                  </td>
                </tr>
              ))}
              {!calculations.length ? (
                <tr>
                  <td colSpan={role === "admin" ? 9 : 8}>
                    No live calculation lines. Connect Square sandbox and run
                    reconciliation.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
