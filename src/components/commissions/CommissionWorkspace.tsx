"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";

type Statement = {
  id: string;
  barber_user_id: string;
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

  async function refresh() {
    setMessage("");
    try {
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Records could not be refreshed.");
    }
  }

  async function dispute(calculationId: string) {
    const reasonCode = window.prompt(
      "Dispute type: attribution, arithmetic, or omission",
      "attribution",
    );
    if (!reasonCode) return;

    const explanation = window.prompt(
      "Explain the issue and the correction requested:",
    );
    if (!explanation) return;

    const response = await fetch("/api/commissions/statements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create_dispute",
        calculationId,
        reasonCode,
        explanation,
      }),
    });
    const result = (await response.json()) as { message?: string };

    setMessage(
      response.ok
        ? "Dispute submitted within the policy workflow."
        : (result.message ?? "Dispute failed."),
    );

    if (response.ok) {
      await refresh();
    }
  }

  function exportCsv() {
    const rows = [
      [
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
            {role === "barber"
              ? "Independent Barber statements"
              : "Reconciliation & statements"}
          </p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl">
            Calculated amounts
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-bone-muted)]">
            Statements calculate and report. They do not move funds, represent
            payroll, or permit historical edits. Locked lines are corrected only by
            a separate Adjustment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <section className="mt-8">
        <h2 className="font-display mb-4 text-2xl">Statement lines</h2>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
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
                  <td>{new Date(item.calculated_at).toLocaleDateString()}</td>
                  <td>{item.attribution_type}</td>
                  <td>{money(item.eligible_basis_cents)}</td>
                  <td>{money(item.tip_cents)}</td>
                  <td>{Math.round(Number(item.barber_rate) * 100)}%</td>
                  <td>{money(item.barber_amount_cents)}</td>
                  <td>{item.status}</td>
                  <td>
                    {role === "barber" &&
                    !["locked", "paid", "voided"].includes(item.status) ? (
                      <button
                        type="button"
                        onClick={() => dispute(item.id)}
                        className="text-[9px] uppercase tracking-[.16em] text-[var(--color-brass)]"
                      >
                        Dispute
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {!calculations.length ? (
                <tr>
                  <td colSpan={8}>
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
