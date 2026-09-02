"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, RefreshCw } from "lucide-react";

type Statement = {
  id: string;
  settlement_period_id: string;
  barber_user_id: string;
  barber_name?: string;
  period_label?: string;
  gross_basis_cents: number;
  tips_cents: number;
  adjustments_cents: number;
  refunds_cents: number;
  final_amount_cents: number;
  paid_at?: string | null;
  payout_method?: string | null;
  payout_reference?: string | null;
  status: string;
  created_at: string;
};

type Calculation = {
  id: string;
  settlement_period_id: string;
  barber_user_id: string;
  barber_name?: string;
  client_name?: string;
  service_name?: string;
  payment_method?: string;
  receipt_number?: string | null;
  receipt_url?: string | null;
  public_reference?: string | null;
  attribution_type: string;
  attribution_source: string;
  gross_service_cents: number;
  discount_cents: number;
  tip_cents: number;
  eligible_basis_cents: number;
  barber_rate: number;
  shop_rate: number;
  barber_amount_cents: number;
  shop_amount_cents: number;
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
  ok?: boolean;
  statements?: Statement[];
  calculations?: Calculation[];
  disputes?: Dispute[];
  message?: string;
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
const percent = (rate: number) => `${Math.round(Number(rate || 0) * 100)}%`;

export function CommissionWorkspace({ role }: { role: "barber" | "admin" }) {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const applyResponse = useCallback((result: StatementsResponse) => {
    setStatements(result.statements ?? []);
    setCalculations(result.calculations ?? []);
    setDisputes(result.disputes ?? []);
  }, []);

  const loadRecords = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/commissions/pay-summary", { cache: "no-store", signal });
    const result = await response.json() as StatementsResponse;
    if (!response.ok || !result.ok) throw new Error(result.message ?? "Records could not be loaded.");
    applyResponse(result);
  }, [applyResponse]);

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => {
      void loadRecords(controller.signal).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "Records could not be loaded.");
      });
    }, 0);
    const timer = window.setInterval(() => void loadRecords().catch(() => undefined), 15_000);
    return () => { controller.abort(); window.clearTimeout(initial); window.clearInterval(timer); };
  }, [loadRecords]);

  const latestStatementsByBarber = useMemo(() => {
    const latest = new Map<string, Statement>();
    for (const statement of statements) if (!latest.has(statement.barber_user_id)) latest.set(statement.barber_user_id, statement);
    return [...latest.values()];
  }, [statements]);

  const latestKeys = useMemo(
    () => new Set(latestStatementsByBarber.map((statement) => `${statement.barber_user_id}:${statement.settlement_period_id}`)),
    [latestStatementsByBarber],
  );

  const currentLines = useMemo(
    () => calculations.filter((item) => latestKeys.has(`${item.barber_user_id}:${item.settlement_period_id}`)),
    [calculations, latestKeys],
  );

  const totals = useMemo(() => ({
    barber: latestStatementsByBarber.reduce((sum, item) => sum + Number(item.final_amount_cents ?? 0), 0),
    shop: currentLines.reduce((sum, item) => sum + Number(item.shop_amount_cents ?? 0), 0),
    basis: currentLines.reduce((sum, item) => sum + Number(item.eligible_basis_cents ?? 0), 0),
  }), [latestStatementsByBarber, currentLines]);

  async function markPaid(statementId: string, amountCents: number) {
    const method = window.prompt(`Record payout of ${money(amountCents)}.\n\nHow was this barber paid? (zelle / cash / other)`, "zelle");
    if (!method) return;
    const reference = window.prompt("Confirmation number or payout note (optional)", "") ?? "";
    setBusy(true); setMessage("Recording payout and locking this statement...");
    try {
      const response = await fetch("/api/commissions/statements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "mark_statement_paid", statementId, payoutMethod: method, payoutReference: reference }),
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "The payout could not be recorded.");
      setMessage("Payout recorded. The paid statement figures are now locked against recalculation.");
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The payout could not be recorded.");
    } finally { setBusy(false); }
  }

  async function refresh() {
    setMessage("");
    try { await loadRecords(); } catch (error) { setMessage(error instanceof Error ? error.message : "Records could not be refreshed."); }
  }

  async function runReconciliation() {
    setBusy(true);
    setMessage("Refreshing Square records and recalculating weekly barber pay...");
    try {
      const response = await fetch("/api/commissions/statements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "run_reconciliation" }) });
      const result = await response.json() as { ok?: boolean; message?: string; result?: { calculated?: number; exceptions?: number; statementsPrepared?: number } };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Calculated amounts could not be updated.");
      const summary = result.result;
      setMessage(`Pay summary refreshed: ${summary?.calculated ?? 0} new line(s), ${summary?.statementsPrepared ?? 0} statement(s) prepared${summary?.exceptions ? `, ${summary.exceptions} item(s) need review` : ""}.`);
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Calculated amounts could not be updated.");
    } finally { setBusy(false); }
  }

  function exportCsv() {
    const rows = [[
      ...(role === "admin" ? ["Barber"] : []), "Date", "Client", "Service", "Payment", "Receipt", "Attribution", "Source", "Commission Basis", "Tips", "Barber Rate", "Barber Share", "Shop Share", "Status",
    ], ...currentLines.map((item) => [
      ...(role === "admin" ? [item.barber_name ?? "Unlinked barber"] : []), item.calculated_at, item.client_name ?? "Client", item.service_name ?? "Service", item.payment_method ?? "", item.receipt_number ?? item.public_reference ?? "", item.attribution_type, item.attribution_source, (item.eligible_basis_cents / 100).toFixed(2), (item.tip_cents / 100).toFixed(2), String(item.barber_rate), (item.barber_amount_cents / 100).toFixed(2), (item.shop_amount_cents / 100).toFixed(2), item.status,
    ])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "luxury-barber-lounge-weekly-pay-summary.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  const latestOwnStatement = latestStatementsByBarber[0];

  return (
    <div>
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">{role === "barber" ? "My weekly commission statement" : "Monday-ready barber payroll"}</p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl">{role === "barber" ? "My commission statement" : "Barber pay summary"}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--color-bone-muted)]">
            {role === "barber"
              ? "Every reconciled service shows the client, payment reference, commission basis, your share, and shop share. Verified existing/barber-owned clients show 100% barber share. Download your weekly PDF anytime."
              : "Square and cash receipts feed the same weekly Monday–Sunday ledger. Review each client/service line, download PDFs, then record Ruben’s payout so paid figures are permanently locked."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role === "admin" ? <button type="button" onClick={() => void runReconciliation()} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)] disabled:opacity-50"><RefreshCw className="h-4 w-4" />Update amounts</button> : null}
          <button type="button" onClick={() => void refresh()} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] uppercase disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] uppercase"><Download className="h-4 w-4" />CSV</button>
          {role === "admin" ? (
            <a href="/api/commissions/statements/pdf" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)]"><FileText className="h-4 w-4" />All barbers PDF</a>
          ) : latestOwnStatement ? (
            <a href={`/api/commissions/statements/pdf?statementId=${encodeURIComponent(latestOwnStatement.id)}`} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)]"><FileText className="h-4 w-4" />Download my PDF</a>
          ) : null}
        </div>
      </header>

      {message ? <p role="status" className="mb-5 rounded-lg border border-[var(--color-brass)]/20 p-3 text-xs">{message}</p> : null}

      <div className="portal-grid">
        <article className="portal-card col-span-3"><p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">Current commission basis</p><p className="metric-value mt-3">{money(totals.basis)}</p></article>
        <article className="portal-card col-span-3"><p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">Barber pay</p><p className="metric-value mt-3">{money(totals.barber)}</p></article>
        <article className="portal-card col-span-3"><p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">Shop share</p><p className="metric-value mt-3">{money(totals.shop)}</p></article>
      </div>

      <section className="mt-8">
        <h2 className="font-display mb-4 text-2xl">{role === "admin" ? "Latest weekly statement by barber" : "My latest weekly statement"}</h2>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead><tr>{role === "admin" ? <th>Barber</th> : null}<th>Period</th><th>Basis</th><th>Tips</th><th>Amount due</th><th>Status</th><th>Statement</th>{role === "admin" ? <th>Payout</th> : null}</tr></thead>
            <tbody>
              {latestStatementsByBarber.map((statement) => (
                <tr key={statement.id}>
                  {role === "admin" ? <td><strong>{statement.barber_name ?? "Unlinked barber"}</strong></td> : null}
                  <td>{statement.period_label ?? "Current week"}</td><td>{money(statement.gross_basis_cents)}</td><td>{money(statement.tips_cents)}</td><td><strong>{money(statement.final_amount_cents)}</strong></td>
                  <td>{statement.paid_at ? <span className="inline-flex rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 text-[9px] uppercase tracking-[.14em] text-emerald-300">Paid</span> : <span className="capitalize">{statement.status}</span>}</td>
                  <td><a href={`/api/commissions/statements/pdf?statementId=${encodeURIComponent(statement.id)}`} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[.12em] text-[var(--color-brass)]"><FileText className="h-3.5 w-3.5" />PDF</a></td>
                  {role === "admin" ? <td>{statement.paid_at ? <span className="text-xs text-[var(--color-bone-muted)]">{statement.payout_method ?? "paid"} · {new Date(statement.paid_at).toLocaleDateString()}{statement.payout_reference ? ` · ${statement.payout_reference}` : ""}</span> : <button type="button" onClick={() => void markPaid(statement.id, statement.final_amount_cents)} disabled={busy} className="rounded-full border border-[var(--color-brass)] px-3 py-1.5 text-[9px] uppercase tracking-[.14em] text-[var(--color-brass)] disabled:opacity-40">Mark paid</button>}</td> : null}
                </tr>
              ))}
              {!latestStatementsByBarber.length ? <tr><td colSpan={role === "admin" ? 8 : 6}>No weekly statements yet. {role === "admin" ? "Press Update amounts after the first reconciled payment." : "Your statement will appear after a reconciled service payment."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display mb-2 text-2xl">Reconciled statement lines</h2>
        <p className="mb-4 max-w-4xl text-xs leading-5 text-[var(--color-bone-muted)]">Client name, service, receipt, attribution, barber rate, barber share, and shop share are shown together so every dollar can be traced back to the underlying visit.</p>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead><tr>{role === "admin" ? <th>Barber</th> : null}<th>Date</th><th>Client</th><th>Service</th><th>Payment / receipt</th><th>Attribution</th><th>Basis</th><th>Rate</th><th>Barber share</th><th>Shop share</th><th>Tips</th><th>Status</th></tr></thead>
            <tbody>
              {currentLines.map((item) => (
                <tr key={item.id}>
                  {role === "admin" ? <td>{item.barber_name ?? "Unlinked barber"}</td> : null}
                  <td>{new Date(item.calculated_at).toLocaleDateString()}</td><td><strong>{item.client_name ?? "Client"}</strong></td><td>{item.service_name ?? "Service"}</td>
                  <td><span className="capitalize">{item.payment_method ?? "payment"}</span>{item.receipt_url ? <a href={item.receipt_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-[10px] text-[var(--color-brass)]">{item.receipt_number ?? "receipt"}<ExternalLink className="h-3 w-3" /></a> : item.receipt_number || item.public_reference ? <span className="ml-2 text-[10px] text-[var(--color-bone-muted)]">{item.receipt_number ?? item.public_reference}</span> : null}</td>
                  <td><strong>{item.attribution_type === "BARBER" ? "Existing / barber client" : "Shop / new client"}</strong><div className="mt-1 text-[9px] text-[var(--color-bone-muted)]">{item.attribution_source?.replaceAll("_", " ")}</div></td>
                  <td>{money(item.eligible_basis_cents)}</td><td><span className={item.attribution_type === "BARBER" ? "font-semibold text-emerald-300" : ""}>{percent(item.barber_rate)}</span></td><td><strong>{money(item.barber_amount_cents)}</strong></td><td>{money(item.shop_amount_cents)}</td><td>{money(item.tip_cents)}</td><td className="capitalize">{item.status}</td>
                </tr>
              ))}
              {!currentLines.length ? <tr><td colSpan={role === "admin" ? 12 : 11}>No reconciled transaction lines are available for the latest statement yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {disputes.length ? <p className="mt-5 text-xs text-[var(--color-bone-muted)]">Open commission review items: {disputes.filter((item) => !["denied", "approved", "closed", "withdrawn"].includes(item.status)).length}. Existing policy requires barber questions to be sent to the owner within 24 hours.</p> : null}
    </div>
  );
}
