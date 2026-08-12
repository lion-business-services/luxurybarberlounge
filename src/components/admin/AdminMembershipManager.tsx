"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Plan = { id: string; name: string; priceCents: number; billingInterval: string; squareCatalogId: string | null; active: boolean; status: string };
type Request = { id: string; clientName: string; requestType: string; requestedPlan: string | null; status: string; reason: string | null; reviewNote: string | null; createdAt: string };

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

export function AdminMembershipManager({ plans, requests, owner }: { plans: Plan[]; requests: Request[]; owner: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>(Object.fromEntries(plans.map((plan) => [plan.id, plan.squareCatalogId ?? ""])));

  async function planAction(planId: string, action: "publish" | "unpublish" | "archive" | "map_square") {
    const squareCatalogId = mapping[planId]?.trim() || null;
    setBusy(`plan:${planId}`); setMessage("");
    const response = await fetch("/api/admin/memberships", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ planId, action, squareCatalogId, reason: action === "map_square" ? "Owner updated Square catalog mapping" : `Owner requested ${action}` }) });
    const body = await response.json().catch(() => null) as { message?: string } | null;
    setMessage(response.ok ? (action === "map_square" ? "Square membership mapping saved." : `Membership plan ${action.replace("unpublish", "unpublished").replace("publish", "published").replace("archive", "archived")}.`) : body?.message ?? "Membership plan could not be updated.");
    if (response.ok) router.refresh();
    setBusy(null);
  }

  async function reviewRequest(id: string, status: "in_review" | "provider_pending" | "completed" | "rejected") {
    const note = status === "completed" ? "Provider action verified and request completed." : status === "rejected" ? "Request reviewed and rejected by operations." : status === "provider_pending" ? "Request reviewed; provider action is pending." : "Request is under operational review.";
    setBusy(`request:${id}`); setMessage("");
    const response = await fetch(`/api/admin/membership-requests/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, note }) });
    const body = await response.json().catch(() => null) as { message?: string } | null;
    setMessage(response.ok ? "Membership request updated." : body?.message ?? "Membership request could not be updated.");
    if (response.ok) router.refresh();
    setBusy(null);
  }

  return <div className="grid gap-5">
    <section className="portal-card">
      <p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Plan control</p>
      <h2 className="font-display mt-2 text-2xl">Membership plans</h2>
      <div className="mt-5 grid gap-3">
        {plans.map((plan) => <article key={plan.id} className="rounded-xl border border-white/[.07] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-xl">{plan.name}</h3><p className="mt-1 text-xs text-[var(--color-bone-muted)]">{money(plan.priceCents)} / {label(plan.billingInterval)} · {label(plan.status)}</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-[.12em]">{plan.squareCatalogId ? "Square linked" : "Square mapping required"}</span></div>
          {owner ? <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end"><label><span className="form-label">Square catalog ID</span><input className="form-control" value={mapping[plan.id] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [plan.id]: event.target.value }))} placeholder="Square catalog object ID" /></label><div className="flex flex-wrap gap-2"><button type="button" disabled={busy === `plan:${plan.id}`} onClick={() => void planAction(plan.id, "map_square")} className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase">Save mapping</button>{plan.status === "published" ? <button type="button" disabled={busy === `plan:${plan.id}`} onClick={() => void planAction(plan.id, "unpublish")} className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase">Unpublish</button> : <button type="button" disabled={busy === `plan:${plan.id}`} onClick={() => void planAction(plan.id, "publish")} className="rounded-full bg-[var(--color-brass)] px-4 py-2 text-[9px] uppercase text-[var(--color-ink)]">Publish</button>}<button type="button" disabled={busy === `plan:${plan.id}`} onClick={() => void planAction(plan.id, "archive")} className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase">Archive</button></div></div> : null}
        </article>)}
        {!plans.length ? <div className="portal-empty">No membership plans yet.</div> : null}
      </div>
    </section>

    <section className="portal-card">
      <p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Request workflow</p>
      <h2 className="font-display mt-2 text-2xl">Membership requests</h2>
      <div className="portal-table-wrap mt-5"><table className="portal-table"><thead><tr><th>Client</th><th>Request</th><th>Plan</th><th>Status</th><th>Submitted</th><th>Controls</th></tr></thead><tbody>
        {requests.map((request) => <tr key={request.id}><td>{request.clientName}</td><td>{label(request.requestType)}</td><td>{request.requestedPlan ?? "Current plan"}</td><td>{label(request.status)}</td><td>{new Date(request.createdAt).toLocaleDateString()}</td><td><div className="flex flex-wrap gap-2"><button type="button" disabled={busy === `request:${request.id}`} onClick={() => void reviewRequest(request.id, "in_review")} className="text-[9px] uppercase text-[var(--color-brass)]">Review</button><button type="button" disabled={busy === `request:${request.id}`} onClick={() => void reviewRequest(request.id, "provider_pending")} className="text-[9px] uppercase">Provider pending</button>{owner ? <button type="button" disabled={busy === `request:${request.id}`} onClick={() => void reviewRequest(request.id, "completed")} className="text-[9px] uppercase">Complete</button> : null}<button type="button" disabled={busy === `request:${request.id}`} onClick={() => void reviewRequest(request.id, "rejected")} className="text-[9px] uppercase">Reject</button></div></td></tr>)}
        {!requests.length ? <tr><td colSpan={6}>No membership requests are waiting for review.</td></tr> : null}
      </tbody></table></div>
      {message ? <p className="mt-4 text-xs text-[var(--color-bone-muted)]" role="status">{message}</p> : null}
    </section>
  </div>;
}
