"use client";

import { useCallback, useEffect, useState } from "react";
import { MailPlus, RefreshCw, UserRoundCheck, X } from "lucide-react";
import { PortalHeader } from "@/components/portal/PortalUI";

type Invitation = { id: string; email: string; intended_role: string; status: string; expires_at: string; created_at: string; accepted_at: string | null };
type User = { id: string; email: string; roles: string[]; createdAt: string; lastSignInAt: string | null };

export function AdminUsersPanel() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("barber");
  const [status, setStatus] = useState("Loading authorized users...");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/invitations", { cache: "no-store" });
    const data = await response.json().catch(() => null) as { ok?: boolean; message?: string; invitations?: Invitation[]; users?: User[] } | null;
    if (!response.ok || !data?.ok) { setStatus(data?.message || "Users could not be loaded."); return; }
    setInvitations(data.invitations ?? []);
    setUsers(data.users ?? []);
    setStatus("Authorized roles are assigned server-side after verified OTP login.");
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/invitations", { cache: "no-store" })
      .then((response) => Promise.all([response, response.json().catch(() => null)]))
      .then(([response, data]) => {
        if (!active) return;
        const payload = data as { ok?: boolean; message?: string; invitations?: Invitation[]; users?: User[] } | null;
        if (!response.ok || !payload?.ok) { setStatus(payload?.message || "Users could not be loaded."); return; }
        setInvitations(payload.invitations ?? []);
        setUsers(payload.users ?? []);
        setStatus("Authorized roles are assigned server-side after verified OTP login.");
      });
    return () => { active = false; };
  }, []);

  async function invite() {
    setBusy(true);
    setStatus("Creating secure invitation...");
    const response = await fetch("/api/admin/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role, expiresInDays: 7 }) });
    const data = await response.json().catch(() => null) as { ok?: boolean; message?: string; delivery?: string } | null;
    if (!response.ok || !data?.ok) setStatus(data?.message || "Invitation failed.");
    else { setEmail(""); setStatus(data.delivery === "accepted" ? "Invitation emailed." : data.delivery === "development" ? "Invitation recorded. Development email provider logged the delivery." : "Invitation recorded, but email delivery failed. The recipient may still request an OTP using the invited address."); await load(); }
    setBusy(false);
  }

  async function revoke(id: string) {
    setBusy(true);
    const response = await fetch(`/api/admin/invitations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
    setStatus(response.ok && data?.ok ? "Invitation revoked." : data?.message || "Invitation could not be revoked.");
    await load();
    setBusy(false);
  }

  return <>
    <PortalHeader eyebrow="Identity and access" title="Users and invitations" copy="Invite staff by verified email, assign a server-controlled role, and review recent portal access. No user can promote their own account." actions={<button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[10px] tracking-[.18em] uppercase"><RefreshCw className="h-4 w-4" /> Refresh</button>} />
    <p className="mb-6 rounded-xl border border-[var(--color-ink-line)] bg-white/[.02] px-4 py-3 text-xs text-[var(--color-bone-muted)]" aria-live="polite">{status}</p>
    <section className="portal-card mb-8">
      <div className="flex items-center gap-3"><MailPlus className="h-5 w-5 text-[var(--color-brass)]" /><h2 className="font-display text-2xl">Invite staff</h2></div>
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
        <label><span className="form-label">Verified email</span><input className="form-control" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        <label><span className="form-label">Authorized role</span><select className="form-control" value={role} onChange={(event) => setRole(event.target.value)}><option value="barber">Independent Barber</option><option value="receptionist">Receptionist</option><option value="manager">Manager</option></select></label>
        <button type="button" disabled={busy || !email} onClick={() => void invite()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-brass)] px-6 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)] disabled:opacity-50"><MailPlus className="h-4 w-4" /> Send invite</button>
      </div>
    </section>
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="portal-card"><div className="flex items-center gap-3"><UserRoundCheck className="h-5 w-5 text-[var(--color-brass)]" /><h2 className="font-display text-2xl">Authorized users</h2></div><div className="mt-5 space-y-3">{users.length ? users.map((user) => <article key={user.id} className="rounded-lg border border-[var(--color-ink-line)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{user.email}</strong><span className="text-[9px] tracking-[.15em] uppercase text-[var(--color-brass)]">{user.roles.join(" · ")}</span></div><p className="mt-2 text-xs text-[var(--color-bone-muted)]">Last sign-in: {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : "Not yet"}</p></article>) : <p className="text-sm text-[var(--color-bone-muted)]">No connected Supabase users are available yet.</p>}</div></section>
      <section className="portal-card"><h2 className="font-display text-2xl">Invitation history</h2><div className="mt-5 space-y-3">{invitations.length ? invitations.map((invitation) => <article key={invitation.id} className="rounded-lg border border-[var(--color-ink-line)] p-4"><div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{invitation.email}</strong><p className="mt-1 text-[9px] tracking-[.15em] uppercase text-[var(--color-brass)]">{invitation.intended_role.replaceAll("_", " ")} · {invitation.status}</p><p className="mt-2 text-xs text-[var(--color-bone-muted)]">Expires {new Date(invitation.expires_at).toLocaleString()}</p></div>{invitation.status === "pending" ? <button type="button" disabled={busy} onClick={() => void revoke(invitation.id)} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-ink-line)]" aria-label={`Revoke invitation for ${invitation.email}`}><X className="h-4 w-4" /></button> : null}</div></article>) : <p className="text-sm text-[var(--color-bone-muted)]">No invitation history is available.</p>}</div></section>
    </div>
  </>;
}
