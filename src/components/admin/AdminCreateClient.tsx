"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminCreateClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false); const [fullName, setFullName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true); setStatus("Preparing client profile...");
    const response = await fetch("/api/admin/clients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName, email, phone, preferredLanguage: "en" }) });
    const body = await response.json().catch(() => null) as { ok?: boolean; message?: string; clientId?: string; delivery?: string } | null;
    if (!response.ok || !body?.ok) setStatus(body?.message || "The client could not be created.");
    else { setStatus(`Client profile prepared. Invitation delivery: ${body.delivery}.`); setFullName(""); setEmail(""); setPhone(""); router.refresh(); }
    setBusy(false);
  }
  return <section className="portal-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] tracking-[.18em] uppercase text-[var(--color-brass)]">Client onboarding</p><h2 className="font-display mt-2 text-2xl">Create a secure client profile</h2></div><button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">{open ? "Close" : "New client"}</button></div>{open ? <div className="mt-5 grid gap-4 md:grid-cols-3"><label><span className="form-label">Full name</span><input className="form-control" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label><span className="form-label">Verified email</span><input className="form-control" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label><span className="form-label">Phone</span><input className="form-control" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><button type="button" disabled={busy || !fullName || !email} onClick={() => void create()} className="w-fit rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)] disabled:opacity-50">{busy ? "Preparing" : "Create and invite"}</button></div> : null}{status ? <p className="mt-4 text-xs text-[var(--color-bone-muted)]" role="status">{status}</p> : null}</section>;
}
