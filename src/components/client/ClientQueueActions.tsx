"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClientQueueActions({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "leaving" | "error">("idle");
  async function leave() {
    if (!window.confirm("Leave the current queue?")) return;
    setState("leaving");
    const response = await fetch("/api/client/queue", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ entryId }) }).catch(() => null);
    if (!response?.ok) {
      setState("error");
      return;
    }
    router.refresh();
  }
  return <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={state === "leaving"} onClick={leave} className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase disabled:opacity-60">{state === "leaving" ? "Leaving" : "Leave queue"}</button>{state === "error" ? <span role="status" className="text-sm text-red-300">The queue could not be updated. Contact the front desk.</span> : null}</div>;
}
