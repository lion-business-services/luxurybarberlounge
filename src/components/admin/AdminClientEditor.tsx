"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminClientDetailData } from "@/lib/portal/admin-data";

export function AdminClientEditor({ client }: { client: AdminClientDetailData }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [language, setLanguage] = useState(client.language === "es" ? "es" : "en");
  const [marketing, setMarketing] = useState(client.marketing);
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState("internal");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function update() {
    setBusy(true); setStatus("Saving client profile...");
    const response = await fetch(`/api/admin/clients/${client.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName, phone: phone || null, preferredLanguage: language, marketingStatus: marketing }) });
    const body = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
    setStatus(response.ok && body?.ok ? "Client profile updated." : body?.message || "Client profile could not be updated.");
    if (response.ok) router.refresh(); setBusy(false);
  }
  async function action(payload: Record<string, unknown>, success: string) {
    setBusy(true); setStatus("Saving...");
    const response = await fetch(`/api/admin/clients/${client.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
    setStatus(response.ok && body?.ok ? success : body?.message || "The client record could not be updated.");
    if (response.ok) { setNote(""); setTag(""); router.refresh(); } setBusy(false);
  }
  return <div className="grid gap-4 xl:grid-cols-2">
    <section className="portal-card"><h2 className="font-display text-2xl">Edit client</h2><div className="mt-5 grid gap-4"><label><span className="form-label">Full name</span><input className="form-control" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label><span className="form-label">Phone</span><input className="form-control" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="form-label">Language</span><select className="form-control" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="es">Spanish</option></select></label><label><span className="form-label">Marketing</span><select className="form-control" value={marketing} onChange={(event) => setMarketing(event.target.value)}><option value="unknown">Unknown</option><option value="subscribed">Subscribed</option><option value="unsubscribed">Unsubscribed</option></select></label></div><button type="button" disabled={busy} onClick={() => void update()} className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)] disabled:opacity-50">Save changes</button></div></section>
    <section className="portal-card"><h2 className="font-display text-2xl">Internal history</h2><label className="mt-5 block"><span className="form-label">New note</span><textarea className="form-control min-h-28" value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="mt-3 flex flex-wrap gap-2"><select className="form-control max-w-48" value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="internal">Internal only</option><option value="client">Client visible</option></select><button type="button" disabled={busy || !note.trim()} onClick={() => void action({ action: "add_note", note, visibility }, "Client note added.")} className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)] disabled:opacity-50">Add note</button></div><div className="mt-5 flex gap-2"><input className="form-control" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="Tag" /><button type="button" disabled={busy || !tag.trim()} onClick={() => void action({ action: "add_tag", tag }, "Client tag added.")} className="rounded-full border border-[var(--color-ink-line)] px-5 text-[9px] tracking-[.14em] uppercase disabled:opacity-50">Add tag</button></div></section>
    {status ? <p className="xl:col-span-2 rounded-xl border border-[var(--color-ink-line)] p-3 text-xs text-[var(--color-bone-muted)]" role="status">{status}</p> : null}
  </div>;
}
