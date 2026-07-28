import Link from "next/link";
import { ArrowUpRight, Check, CircleAlert, PlugZap, Search, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { StatusBadge } from "@/components/marketing/StatusBadge";

export function PortalHeader({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: React.ReactNode }) {
  return <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">{eyebrow}</p><h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-bone-muted)]">{copy}</p></div>{actions ? <div className="shrink-0">{actions}</div> : null}</header>;
}

export function DemoModeBanner() {
  return <div className="mb-6 flex items-start gap-3 rounded-xl border border-cyan-700/30 bg-cyan-950/15 px-4 py-3 text-xs leading-5 text-cyan-100"><PlugZap className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Development workspace.</strong> Curated records are clearly marked and safe for review. Activate Supabase, Square, email, and SMS through the prepared adapters when production credentials are approved.</span></div>;
}

export function MetricGrid({ metrics }: { metrics: ReadonlyArray<{ label: string; value: string; note: string }> }) {
  return <div className="portal-grid">{metrics.map((metric) => <article key={metric.label} className="portal-card col-span-3"><p className="text-[9px] tracking-[.22em] uppercase text-[var(--color-brass)]">{metric.label}</p><p className="metric-value mt-3">{metric.value}</p><p className="mt-2 text-xs text-[var(--color-bone-muted)]">{metric.note}</p></article>)}</div>;
}

export function PortalTable({ columns, rows }: { columns: string[]; rows: ReadonlyArray<Record<string, string>> }) {
  return <div className="portal-table-wrap"><table className="portal-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{column.toLowerCase().includes("status") ? <StatusBadge tone={row[column] === "Confirmed" || row[column] === "Completed" || row[column] === "Resolved" ? "success" : row[column] === "Waiting" || row[column] === "Review" ? "warning" : "neutral"}>{row[column] ?? "—"}</StatusBadge> : row[column] ?? "—"}</td>)}</tr>)}</tbody></table></div>;
}

export function Toolbar({ placeholder = "Search records" }: { placeholder?: string }) {
  return <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">{placeholder}</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-bone-muted)]" /><input className="form-control pl-10" placeholder={placeholder} /></label><button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-ink-line)] px-4 py-3 text-[10px] tracking-[.18em] uppercase"><SlidersHorizontal className="h-4 w-4" /> Filters</button></div>;
}

export function ActionCard({ title, copy, href, label, tone = "default" }: { title: string; copy: string; href: string; label: string; tone?: "default" | "warning" }) {
  return <article className={clsx("portal-card", tone === "warning" && "border-amber-600/25 bg-amber-950/10")}><h3 className="font-display text-xl">{title}</h3><p className="mt-3 text-xs leading-6 text-[var(--color-bone-muted)]">{copy}</p><Link href={href} className="mt-5 inline-flex items-center gap-2 text-[10px] tracking-[.18em] uppercase text-[var(--color-brass)]">{label}<ArrowUpRight className="h-4 w-4" /></Link></article>;
}

export function EmptyState({ title, copy, action }: { title: string; copy: string; action?: { href: string; label: string } }) {
  return <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--color-ink-line)] p-8 text-center"><div><CircleAlert className="mx-auto h-7 w-7 text-[var(--color-brass)]" /><h2 className="font-display mt-4 text-2xl">{title}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--color-bone-muted)]">{copy}</p>{action ? <Link href={action.href} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)]">{action.label}<ArrowUpRight className="h-4 w-4" /></Link> : null}</div></div>;
}

export function Checklist({ items }: { items: string[] }) {
  return <ul className="space-y-3">{items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--color-bone-muted)]"><Check className="mt-1 h-4 w-4 shrink-0 text-[var(--color-brass)]" />{item}</li>)}</ul>;
}
