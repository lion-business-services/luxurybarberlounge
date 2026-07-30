"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Rule = { id: string; name: string; key: string; triggerKey: string; channels: string[]; delaySeconds: number; active: boolean; testMode: boolean; version: number };

export function AdminAutomationManager({ rules, owner }: { rules: Rule[]; owner: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("Owner-reviewed configuration change");
  const [busy, setBusy] = useState<string | null>(null);
  async function change(id: string, action: "enable" | "disable" | "enable_test" | "disable_test") {
    if (reason.trim().length < 3) { setMessage("Enter a reason before changing an automation."); return; }
    setBusy(id); setMessage("");
    const response = await fetch(`/api/admin/automations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason: reason.trim() }) });
    const payload = await response.json().catch(() => ({}));
    setBusy(null); setMessage(payload.message ?? (response.ok ? "Automation state updated." : "The automation could not be updated."));
    if (response.ok) router.refresh();
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("create"); setMessage("");
    const response = await fetch("/api/admin/automations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      name: String(form.get("name") ?? ""), key: String(form.get("key") ?? ""), triggerKey: String(form.get("triggerKey") ?? ""), channels: [String(form.get("channel") ?? "email")], delaySeconds: Number(form.get("delaySeconds") ?? 0),
    }) });
    const payload = await response.json().catch(() => ({}));
    setBusy(null); setMessage(payload.message ?? (response.ok ? "Automation created in test mode." : "The automation could not be created."));
    if (response.ok) { event.currentTarget.reset(); router.refresh(); }
  }
  return <div className="grid gap-5">
    {message ? <p role="status" aria-live="polite" className="rounded-lg border border-white/10 bg-white/[.04] p-3 text-sm">{message}</p> : null}
    {owner ? <form onSubmit={create} className="grid gap-3 rounded-xl border border-white/[.08] bg-white/[.025] p-5 md:grid-cols-2 xl:grid-cols-5">
      <label className="grid gap-2 text-xs">Name<input name="name" required minLength={3} className="rounded-lg border border-white/10 bg-black/30 p-3" /></label>
      <label className="grid gap-2 text-xs">Stable key<input name="key" required pattern="[a-z0-9_]+" placeholder="booking_reminder" className="rounded-lg border border-white/10 bg-black/30 p-3" /></label>
      <label className="grid gap-2 text-xs">Trigger<input name="triggerKey" required placeholder="booking.confirmed" className="rounded-lg border border-white/10 bg-black/30 p-3" /></label>
      <label className="grid gap-2 text-xs">Channel<select name="channel" className="rounded-lg border border-white/10 bg-black/30 p-3"><option value="email">Email</option><option value="in_app">In-app</option><option value="sms">SMS</option></select></label>
      <label className="grid gap-2 text-xs">Delay seconds<input name="delaySeconds" type="number" min="0" max="2592000" defaultValue="0" className="rounded-lg border border-white/10 bg-black/30 p-3" /></label>
      <button disabled={busy === "create"} className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-xs uppercase tracking-[.14em] text-black md:col-span-2 xl:col-span-5">{busy === "create" ? "Creating…" : "Create in test mode"}</button>
    </form> : <p className="text-sm text-[var(--color-bone-muted)]">Only the owner may create or activate automation rules.</p>}
    {owner ? <label className="grid gap-2 text-xs">Reason for the next state change<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} className="rounded-lg border border-white/10 bg-black/30 p-3" /></label> : null}
    <div className="grid gap-3">{rules.map((rule) => <article key={rule.id} className="grid gap-4 rounded-xl border border-white/[.08] p-4 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-xl">{rule.name}</h3><span className="rounded-full bg-white/[.05] px-2 py-1 text-[9px] uppercase tracking-[.12em] text-[var(--color-brass)]">{rule.active ? "Active" : rule.testMode ? "Test mode" : "Inactive"}</span></div><p className="mt-2 text-xs text-[var(--color-bone-muted)]">{rule.triggerKey} · {rule.channels.join(", ")} · {rule.delaySeconds}s delay · v{rule.version}</p><p className="mt-1 text-[10px] text-[var(--color-bone-muted)]">Key: {rule.key}</p></div>{owner ? <div className="flex flex-wrap gap-2"><button disabled={busy === rule.id} onClick={() => change(rule.id, rule.active ? "disable" : "enable")} className="rounded-full border border-[var(--color-brass)] px-4 py-2 text-[9px] uppercase tracking-[.12em]">{rule.active ? "Disable" : "Activate"}</button><button disabled={busy === rule.id} onClick={() => change(rule.id, rule.testMode ? "disable_test" : "enable_test")} className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase tracking-[.12em]">{rule.testMode ? "Exit test" : "Test mode"}</button></div> : null}</article>)}</div>
  </div>;
}
