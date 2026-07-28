"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function AuthCallbackClient({ code, next }: { code: string; next: string }) {
  const [status, setStatus] = useState<"working" | "success" | "error">("working");
  const [message, setMessage] = useState("Verifying your secure link.");

  useEffect(() => {
    let active = true;
    async function exchange() {
      const client = getBrowserSupabase();
      if (!client || !code) {
        if (active) {
          setStatus("error");
          setMessage("This link cannot be completed. Request a new portal link or contact the lounge.");
        }
        return;
      }
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!active) return;
      if (error) {
        setStatus("error");
        setMessage("The secure link is invalid or expired. Request a new one.");
        return;
      }
      setStatus("success");
      setMessage("Your account was verified. Continue to your portal.");
    }
    void exchange();
    return () => { active = false; };
  }, [code]);

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/client";
  return (
    <main className="grid min-h-[70svh] place-items-center px-6 py-16">
      <section className="w-full max-w-md border border-[var(--color-brass)]/25 bg-[var(--color-ink-soft)] p-8 text-center">
        {status === "working" ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--color-brass)]" /> : status === "success" ? <Check className="mx-auto h-8 w-8 text-emerald-300" /> : <TriangleAlert className="mx-auto h-8 w-8 text-amber-300" />}
        <h1 className="font-display mt-5 text-3xl">{status === "working" ? "Verifying access" : status === "success" ? "Access verified" : "Link unavailable"}</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">{message}</p>
        <Link href={status === "success" ? safeNext : "/login"} className="mt-7 inline-flex rounded-full bg-[var(--color-brass)] px-7 py-3 text-[10px] tracking-[.2em] uppercase text-[var(--color-ink)]">{status === "success" ? "Continue" : "Return to login"}</Link>
      </section>
    </main>
  );
}
