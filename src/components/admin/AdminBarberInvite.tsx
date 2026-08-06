"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

export function AdminBarberInvite() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function invite() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role: "barber", expiresInDays: 7 }) });
    const body = await response.json() as { message?: string; delivery?: string };
    setMessage(response.ok ? `Invitation created${body.delivery ? ` · ${body.delivery}` : ""}.` : body.message ?? "The invitation could not be sent.");
    if (response.ok) setEmail("");
    setBusy(false);
  }

  return <section className="portal-card"><p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Add a barber</p><h2 className="font-display mt-2 text-2xl">Send secure invitation</h2><p className="mt-2 text-xs leading-5 text-[var(--color-bone-muted)]">The barber verifies their email code before receiving barber access. Owner access can never be assigned here.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><input type="email" value={email} onChange={(event)=>setEmail(event.target.value)} className="form-control flex-1" placeholder="barber@example.com" aria-label="Barber email"/><button disabled={busy || !email} onClick={()=>void invite()} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] uppercase tracking-[.16em] text-black disabled:opacity-50"><UserPlus className="h-4 w-4" />{busy?"Sending":"Invite barber"}</button></div>{message?<p className="mt-4 text-xs text-[var(--color-bone-muted)]" role="status">{message}</p>:null}</section>;
}
