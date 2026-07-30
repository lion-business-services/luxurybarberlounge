"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "@/components/client/client-portal.module.css";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Client portal route failed", error.digest ?? "no-digest"); }, [error]);
  return <div className={styles.heroCard} role="alert"><p className={styles.eyebrow}>Temporary interruption</p><h1 className="font-display mt-3 text-4xl">Your account could not be loaded.</h1><p className={`mt-3 max-w-xl text-sm leading-6 ${styles.muted}`}>No private details were exposed. Retry the secure request or return to the client dashboard.</p><div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={reset} className="rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Try again</button><Link href="/client" className="rounded-full border border-[var(--color-ink-line)] px-5 py-3 text-[9px] tracking-[.16em] uppercase">Dashboard</Link></div></div>;
}
