"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, LockKeyhole, Mail } from "lucide-react";

export function AuthCard({ mode }: { mode: "login" | "register" | "forgot" }) {
  const [sent, setSent] = useState(false);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }
  const title = mode === "login" ? "Welcome back." : mode === "register" ? "Create your client account." : "Reset your access.";
  const copy = mode === "login" ? "Use email or a passwordless link. Staff roles are assigned only by authorized management." : mode === "register" ? "Client registration never grants barber, manager, owner, or administrator access." : "Enter your account email to request a secure recovery link when portal access is active.";
  return (
    <main className="relative grid min-h-[calc(100svh-82px)] place-items-center overflow-hidden px-6 py-16 sm:px-10">
      <Image src="/hero/lounge-wall.webp" alt="" fill sizes="100vw" className="object-cover opacity-20" priority />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(184,134,42,.12),rgba(10,10,10,.92)_65%)]" />
      <section className="relative w-full max-w-md border border-[var(--color-brass)]/25 bg-[#0c0c0c]/95 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
        <div className="mx-auto relative h-24 w-24"><Image src="/brand/lbl-crest.webp" alt="Luxury Barber Lounge crest" fill sizes="96px" className="object-contain" /></div>
        <p className="mt-6 text-center text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Secure portal</p>
        <h1 className="font-display mt-3 text-center text-3xl">{title}</h1>
        <p className="mt-4 text-center text-xs leading-6 text-[var(--color-bone-muted)]">{copy}</p>
        {sent ? <div role="status" className="mt-7 border border-emerald-700/35 bg-emerald-950/20 p-6 text-center"><Check className="mx-auto h-6 w-6 text-emerald-300" /><h2 className="font-display mt-3 text-xl">Interface verified.</h2><p className="mt-2 text-xs leading-6 text-[var(--color-bone-muted)]">Portal access is being prepared. No account or appointment was created from this preview form.</p><Link href="/client" className="mt-5 inline-flex items-center gap-2 text-[10px] tracking-[.18em] uppercase text-[var(--color-brass)]">Review client portal <ArrowRight className="h-4 w-4" /></Link></div> : <form onSubmit={submit} className="mt-7">
          {mode === "register" ? <label className="block"><span className="form-label">Full name</span><input className="form-control" autoComplete="name" required /></label> : null}
          <label className="mt-4 block"><span className="form-label">Email</span><span className="relative block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-bone-muted)]" /><input className="form-control pl-10" type="email" autoComplete="email" required /></span></label>
          {mode !== "forgot" ? <label className="mt-4 block"><span className="form-label">Password</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-bone-muted)]" /><input className="form-control pl-10" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required /></span></label> : null}
          <button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brass)] px-6 py-3.5 text-[10px] tracking-[.2em] uppercase text-[var(--color-ink)]">{mode === "login" ? "Continue" : mode === "register" ? "Create client account" : "Send recovery link"}<ArrowRight className="h-4 w-4" /></button>
        </form>}
        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] text-[var(--color-bone-muted)]">{mode !== "login" ? <Link href="/login" className="hover:text-[var(--color-brass)]">Sign in</Link> : <><Link href="/register" className="hover:text-[var(--color-brass)]">Create account</Link><Link href="/forgot-password" className="hover:text-[var(--color-brass)]">Forgot password</Link></>}</div>
      </section>
    </main>
  );
}
