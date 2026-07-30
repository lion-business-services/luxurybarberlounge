"use client";

import { useState } from "react";

export function ClientMembershipRequest({ membershipId }: { membershipId?: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function requestChange(requestType: "upgrade" | "downgrade" | "pause" | "resume" | "cancel" | "activate") {
    setState("sending");
    const response = await fetch("/api/client/membership-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipId: membershipId ?? null, requestType }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null) as { message?: string } | null;
    if (!response?.ok) {
      setState("error");
      setMessage(body?.message ?? "The request could not be recorded.");
      return;
    }
    setState("sent");
    setMessage("Your request was recorded for authorized review. No billing change is implied until confirmed.");
  }

  return <div className="mt-6">
    <div className="flex flex-wrap gap-2">
      {membershipId ? <><button type="button" disabled={state === "sending"} onClick={() => requestChange("upgrade")} className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Request plan change</button><button type="button" disabled={state === "sending"} onClick={() => requestChange("pause")} className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase">Request pause</button><button type="button" disabled={state === "sending"} onClick={() => requestChange("cancel")} className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase">Request cancellation</button></> : <button type="button" disabled={state === "sending"} onClick={() => requestChange("activate")} className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Request membership</button>}
    </div>
    {message ? <p role="status" className={`mt-3 text-sm ${state === "error" ? "text-red-300" : "text-[var(--color-bone-muted)]"}`}>{message}</p> : null}
  </div>;
}
