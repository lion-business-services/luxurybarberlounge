"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./client-portal.module.css";

export function ClientSecurityPanel() {
  const router = useRouter();
  const [busy, setBusy] = useState<"local" | "global" | null>(null);

  async function signOut(scope: "local" | "global") {
    setBusy(scope);
    await fetch(scope === "global" ? "/api/auth/logout-all" : "/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login?reason=signed-out");
    router.refresh();
  }

  return <section className={styles.card}>
    <p className={styles.eyebrow}>Account security</p>
    <h2 className="font-display mt-2 text-2xl">Sessions</h2>
    <p className={`mt-3 text-sm leading-6 ${styles.muted}`}>End this session or revoke every active Supabase session connected to your account.</p>
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" disabled={busy !== null} onClick={() => signOut("local")} className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)] disabled:opacity-60">Sign out this device</button>
      <button type="button" disabled={busy !== null} onClick={() => signOut("global")} className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase disabled:opacity-60">Sign out all devices</button>
    </div>
  </section>;
}
