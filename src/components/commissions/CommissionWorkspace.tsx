"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, RefreshCw } from "lucide-react";

type Statement = {
  id: string;
  settlement_period_id: string;
  barber_user_id: string;
  barber_name?: string;
  period_label?: string;
  period_starts_at?: string | null;
  period_ends_at?: string | null;
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
  transaction_at?: string | null;
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

type ShareTotals = {
  basis: number;
  tips: number;
  barber: number;
  shop: number;
  combined: number;
  transactions: number;
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
const percent = (rate: number) => `${Math.round(Number(rate || 0) * 100)}%`;
const TIME_ZONE = "America/New_York";

function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function displayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { timeZone: TIME_ZONE, month: "short", day: "numeric", year: "numeric" });
}

function summarize(lines: Calculation[]): ShareTotals {
  const basis = lines.reduce((sum, item) => sum + Number(item.eligible_basis_cents ?? 0), 0);
  const tips = lines.reduce((sum, item) => sum + Number(item.tip_cents ?? 0), 0);
  const barber = lines.reduce((sum, item) => sum + Number(item.barber_amount_cents ?? 0), 0);
  const shop = lines.reduce((sum, item) => sum + Number(item.shop_amount_cents ?? 0), 0);
  return { basis, tips, barber, shop, combined: barber + shop, transactions: lines.length };
}

function statusLabel(status: string, paidAt?: string | null) {
  if (paidAt || status === "paid") return "Paid";
  if (status === "review" || status === "provisional") return "Ready to review";
  if (status === "final") return "Final";
  if (status === "voided") return "Voided";
  return status.replaceAll("_", " ");
}

export function CommissionWorkspace({ role }: { role: "barber" | "admin" }) {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const applyResponse = useCallback((result: StatementsResponse) => {
    setStatements(result.statements ?? []);
    setCalculations(result.calculations ?? []);
    setDisputes(result.disputes ?? []);
    setLastUpdatedAt(new Date());
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

  const todayKey = dateKey(new Date());
  const todayLines = useMemo(
    () => currentLines.filter((item) => dateKey(item.transaction_at ?? item.calculated_at) === todayKey),
    [currentLines, todayKey],
  );
  const todayTotals = useMemo(() => summarize(todayLines), [todayLines]);
  const weekTotals = useMemo(() => summarize(currentLines), [currentLines]);

  const statementTotals = useMemo(() => {
    const map = new Map<string, ShareTotals>();
    for (const statement of statements) {
      const key = `${statement.barber_user_id}:${statement.settlement_period_id}`;
      const lines = calculations.filter((item) => `${item.barber_user_id}:${item.settlement_period_id}` === key);
      map.set(key, summarize(lines));
    }
    return map;
  }, [calculations, statements]);

  const sortedCalculations = useMemo(
    () => [...calculations].sort((a, b) => new Date(b.transaction_at ?? b.calculated_at).getTime() - new Date(a.transaction_at ?? a.calculated_at).getTime()),
    [calculations],
  );

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
    setMessage("Reconciling the latest Square and cash activity...");
    try {
      const response = await fetch("/api/commissions/statements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "run_reconciliation" }) });
      const result = await response.json() as { ok?: boolean; message?: string; result?: { calculated?: number; exceptions?: number; statementsPrepared?: number } };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Calculated amounts could not be updated.");
      const summary = result.result;
      setMessage(`Ledger synchronized: ${summary?.calculated ?? 0} transaction line(s), ${summary?.statementsPrepared ?? 0} statement(s) refreshed${summary?.exceptions ? `, ${summary.exceptions} item(s) need review` : ""}.`);
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Calculated amounts could not be updated.");
    } finally { setBusy(false); }
  }

  function exportCsv() {
    const rows = [[
      ...(role === "admin" ? ["Barber"] : []), "Transaction Date", "Client", "Service", "Payment", "Receipt", "Attribution", "Source", "Commission Basis", "Tips", "Barber Rate", "Barber Share", "Shop Rate", "Shop Share", "Status",
    ], ...sortedCalculations.map((item) => [
      ...(role === "admin" ? [item.barber_name ?? "Unlinked barber"] : []), item.transaction_at ?? item.calculated_at, item.client_name ?? "Client", item.service_name ?? "Service", item.payment_method ?? "", item.receipt_number ?? item.public_reference ?? "", item.attribution_type, item.attribution_source, (item.eligible_basis_cents / 100).toFixed(2), (item.tip_cents / 100).toFixed(2), String(item.barber_rate), (item.barber_amount_cents / 100).toFixed(2), String(item.shop_rate), (item.shop_amount_cents / 100).toFixed(2), item.status,
    ])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "luxury-barber-lounge-commission-ledger.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  const latestOwnStatement = latestStatementsByBarber[0];

  return (
    <div>
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">{role === "barber" ? "Live commission ledger" : "Live commission & shop-share ledger"}</p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl">{role === "barber" ? "My commissions" : "Commissions"}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--color-bone-muted)]">
            Square and cash activity flows into one reconciled ledger. Every transaction shows the commission basis, barber rate, barber share, shop rate, shop share, tips, payment reference, and statement status. Review statements stay continuously updated until the owner records payout, then the paid figures are locked.
          </p>
          <p className="mt-3 text-[10px] tracking-[.14em] uppercase text-[var(--color-bone-muted)]">
            Auto-refresh every 15 seconds{lastUpdatedAt ? ` · Last refreshed ${lastUpdatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role === "admin" ? <button type="button" onClick={() => void runReconciliation()} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)] disabled:opacity-50"><RefreshCw className="h-4 w-4" />Reconcile now</button> : null}
          <button type="button" onClick={() => void refresh()} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] uppercase disabled:opacity-50"><RefreshCw className="h-4 w-4" />Refresh</button>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-4 py-2 text-[9px] uppercase"><Download className="h-4 w-4" />CSV</button>
          {role === "admin" ? (
            <a href="/api/commissions/statements/pdf" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)]"><FileText className="h-4 w-4" />Current statements PDF</a>
          ) : latestOwnStatement ? (
            <a href={`/api/commissions/statements/pdf?statementId=${encodeURIComponent(latestOwnStatement.id)}`} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)]"><FileText className="h-4 w-4" />Download current PDF</a>
          ) : null}
        </div>
      </header>

      {message ? <p role="status" className="mb-5 rounded-lg border border-[var(--color-brass)]/20 p-3 text-xs">{message}</p> : null}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">Daily shares</p><h2 className="font-display mt-2 text-2xl">Today</h2></div>
          <p className="text-[10px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">{todayTotals.transactions} reconciled transaction{todayTotals.transactions === 1 ? "" : "s"} · Basis {money(todayTotals.basis)} · Tips {money(todayTotals.tips)}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ShareCard label={role === "barber" ? "My share today" : "Barber shares today"} value={todayTotals.barber} />
          <ShareCard label="Shop share today" value={todayTotals.shop} />
          <ShareCard label="Total allocated today" value={todayTotals.combined} />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">Weekly shares</p><h2 className="font-display mt-2 text-2xl">Current Monday–Sunday period</h2></div>
          <p className="text-[10px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">{weekTotals.transactions} reconciled transaction{weekTotals.transactions === 1 ? "" : "s"} · Basis {money(weekTotals.basis)} · Tips {money(weekTotals.tips)}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ShareCard label={role === "barber" ? "My share this week" : "Barber shares this week"} value={weekTotals.barber} />
          <ShareCard label="Shop share this week" value={weekTotals.shop} />
          <ShareCard label="Total allocated this week" value={weekTotals.combined} />
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">Statement register</p><h2 className="font-display mt-2 text-2xl">Ready-to-review weekly statements</h2></div>
          <p className="max-w-2xl text-right text-xs leading-5 text-[var(--color-bone-muted)]">Review statements remain live and update from reconciled transactions. A paid statement is locked and preserved as the payout record.</p>
        </div>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead><tr>{role === "admin" ? <th>Barber</th> : null}<th>Period</th><th>Txns</th><th>Basis</th><th>Barber share</th><th>Shop share</th><th>Tips</th><th>Adjustments</th><th>Amount due</th><th>Status</th><th>PDF</th>{role === "admin" ? <th>Payout</th> : null}</tr></thead>
            <tbody>
              {statements.map((statement) => {
                const key = `${statement.barber_user_id}:${statement.settlement_period_id}`;
                const totals = statementTotals.get(key) ?? { basis: 0, tips: 0, barber: 0, shop: 0, combined: 0, transactions: 0 };
                const label = statusLabel(statement.status, statement.paid_at);
                return (
                  <tr key={statement.id}>
                    {role === "admin" ? <td><strong>{statement.barber_name ?? "Unlinked barber"}</strong></td> : null}
                    <td><strong>{statement.period_label ?? "Weekly statement"}</strong><div className="mt-1 text-[9px] text-[var(--color-bone-muted)]">{displayDate(statement.period_starts_at)}–{displayDate(statement.period_ends_at)}</div></td>
                    <td>{totals.transactions}</td>
                    <td>{money(statement.gross_basis_cents)}</td>
                    <td><strong className="text-[var(--color-bone)]">{money(totals.barber)}</strong></td>
                    <td><strong className="text-[var(--color-bone)]">{money(totals.shop)}</strong></td>
                    <td>{money(statement.tips_cents)}</td>
                    <td>{money(statement.adjustments_cents)}</td>
                    <td><strong>{money(statement.final_amount_cents)}</strong></td>
                    <td>{statement.paid_at ? <span className="inline-flex rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 text-[9px] uppercase tracking-[.14em] text-emerald-300">{label}</span> : <span className="inline-flex rounded-full border border-[var(--color-brass)]/40 bg-[var(--color-brass)]/10 px-2.5 py-1 text-[9px] uppercase tracking-[.14em] text-[var(--color-brass)]">{label}</span>}</td>
                    <td><a href={`/api/commissions/statements/pdf?statementId=${encodeURIComponent(statement.id)}`} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[.12em] text-[var(--color-brass)]"><FileText className="h-3.5 w-3.5" />Download</a></td>
                    {role === "admin" ? <td>{statement.paid_at ? <span className="text-xs text-[var(--color-bone-muted)]">{statement.payout_method ?? "paid"} · {displayDate(statement.paid_at)}{statement.payout_reference ? ` · ${statement.payout_reference}` : ""}</span> : <button type="button" onClick={() => void markPaid(statement.id, statement.final_amount_cents)} disabled={busy} className="rounded-full border border-[var(--color-brass)] px-3 py-1.5 text-[9px] uppercase tracking-[.14em] text-[var(--color-brass)] disabled:opacity-40">Mark paid</button>}</td> : null}
                  </tr>
                );
              })}
              {!statements.length ? <tr><td colSpan={role === "admin" ? 12 : 10}>No commission statements are available yet. The first reconciled payment will create a ready-to-review weekly statement automatically.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">Transaction ledger</p>
          <h2 className="font-display mt-2 text-2xl">Reconciled commission transactions</h2>
          <p className="mt-2 max-w-4xl text-xs leading-5 text-[var(--color-bone-muted)]">Barber and shop shares are calculated from the same commission basis and displayed side by side on every row. Receipt/payment references and attribution evidence remain attached to the transaction.</p>
        </div>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead><tr><th>Date</th>{role === "admin" ? <th>Barber</th> : null}<th>Client</th><th>Service</th><th>Payment / receipt</th><th>Basis</th><th>Barber rate</th><th>Barber share</th><th>Shop rate</th><th>Shop share</th><th>Tips</th><th>Attribution</th><th>Status</th></tr></thead>
            <tbody>
              {sortedCalculations.map((item) => (
                <tr key={item.id}>
                  <td>{displayDate(item.transaction_at ?? item.calculated_at)}</td>
                  {role === "admin" ? <td><strong>{item.barber_name ?? "Unlinked barber"}</strong></td> : null}
                  <td><strong>{item.client_name ?? "Client"}</strong></td>
                  <td>{item.service_name ?? "Service"}</td>
                  <td><span className="capitalize">{item.payment_method ?? "payment"}</span>{item.receipt_url ? <a href={item.receipt_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-[10px] text-[var(--color-brass)]">{item.receipt_number ?? "receipt"}<ExternalLink className="h-3 w-3" /></a> : item.receipt_number || item.public_reference ? <span className="ml-2 text-[10px] text-[var(--color-bone-muted)]">{item.receipt_number ?? item.public_reference}</span> : null}</td>
                  <td>{money(item.eligible_basis_cents)}</td>
                  <td><strong>{percent(item.barber_rate)}</strong></td>
                  <td><strong className="text-emerald-300">{money(item.barber_amount_cents)}</strong></td>
                  <td>{percent(item.shop_rate)}</td>
                  <td><strong className="text-[var(--color-brass)]">{money(item.shop_amount_cents)}</strong></td>
                  <td>{money(item.tip_cents)}</td>
                  <td><strong>{item.attribution_type === "BARBER" ? "Existing / barber client" : "Shop / new client"}</strong><div className="mt-1 text-[9px] text-[var(--color-bone-muted)]">{item.attribution_source?.replaceAll("_", " ")}</div></td>
                  <td className="capitalize">{item.status === "provisional" ? "reconciled" : item.status}</td>
                </tr>
              ))}
              {!sortedCalculations.length ? <tr><td colSpan={role === "admin" ? 13 : 12}>No reconciled commission transactions are available yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {disputes.length ? <p className="mt-5 text-xs text-[var(--color-bone-muted)]">Open commission review items: {disputes.filter((item) => !["denied", "approved", "closed", "withdrawn"].includes(item.status)).length}. Existing policy requires barber questions to be sent to the owner within 24 hours.</p> : null}
    </div>
  );
}

function ShareCard({ label, value }: { label: string; value: number }) {
  return <article className="portal-card"><p className="text-[9px] uppercase tracking-[.2em] text-[var(--color-brass)]">{label}</p><p className="metric-value mt-3">{money(value)}</p></article>;
}