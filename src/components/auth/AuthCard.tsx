"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";

type Stage = "email" | "sending" | "code" | "verifying" | "success";

type ApiResult = { ok?: boolean; message?: string; retryAfter?: number; destination?: string; code?: string };

const OTP_LENGTH = 6;

export function AuthCard({ mode }: { mode: "login" | "register" | "forgot" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? undefined;
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const title = mode === "register" ? "Create secure access." : mode === "forgot" ? "Recover secure access." : "Welcome back.";
  const copy = mode === "register"
    ? "Enter your email and we will send a six-digit code. New verified guests receive client access only."
    : "No password required. Enter your email and use the six-digit code delivered securely to your inbox.";
  const code = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  async function requestCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setMessage("");
    setStage("sending");
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, next: nextPath }),
      });
      const result = await response.json() as ApiResult;

      // A throttle means a code was ALREADY sent successfully moments ago.
      // Move the person forward to code entry instead of showing an error that
      // makes a working login look broken.
      if (response.status === 429 || result.code === "OTP_RATE_LIMITED") {
        setMessage(result.message || "A code was already sent. Please check your inbox.");
        setCountdown(result.retryAfter ?? 30);
        setStage("code");
        window.setTimeout(() => inputs.current[0]?.focus(), 60);
        return;
      }

      if (!response.ok || !result.ok) throw new Error(result.message || "We could not send a code right now.");
      setMessage(result.message || "A six-digit code is on its way.");
      setCountdown(result.retryAfter ?? 60);
      setStage("code");
      window.setTimeout(() => inputs.current[0]?.focus(), 60);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send a code right now.");
      setStage("email");
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the complete six-digit code.");
      return;
    }
    setError("");
    setStage("verifying");
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, token: code, next: nextPath }),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.ok || !result.destination) throw new Error(result.message || "That code could not be verified.");
      setStage("success");
      setMessage("Secure access confirmed. Opening your workspace…");
      router.replace(result.destination);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That code could not be verified.");
      setStage("code");
      setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      window.setTimeout(() => inputs.current[0]?.focus(), 60);
    }
  }

  function updateDigit(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    setDigits((current) => current.map((digit, itemIndex) => itemIndex === index ? value : digit));
    if (value && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function handleKey(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const value = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!value) return;
    event.preventDefault();
    const next = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");
    setDigits(next);
    inputs.current[Math.min(value.length, OTP_LENGTH) - 1]?.focus();
  }

  function changeEmail() {
    setStage("email");
    setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
    setError("");
    setMessage("");
  }

  const busy = stage === "sending" || stage === "verifying";

  return (
    <main className="relative grid min-h-[calc(100svh-72px)] place-items-center overflow-hidden px-5 py-12 sm:px-10 sm:py-16">
      <Image src="/hero/lounge-wall.webp" alt="" fill sizes="100vw" className="object-cover opacity-20" priority />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(184,134,42,.12),rgba(10,10,10,.94)_68%)]" />
      <section className="relative w-full max-w-md border border-[var(--color-brass)]/25 bg-[#0c0c0c]/96 p-6 shadow-2xl sm:p-9 sm:backdrop-blur-xl" aria-labelledby="auth-title">
        <div className="relative mx-auto h-20 w-20 sm:h-24 sm:w-24"><Image src="/brand/lbl-crest.webp" alt="Luxury Barber Lounge crest" fill sizes="96px" className="object-contain" /></div>
        <p className="mt-6 text-center text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Passwordless secure portal</p>
        <h1 id="auth-title" className="font-display mt-3 text-center text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-4 text-center text-xs leading-6 text-[var(--color-bone-muted)]">{copy}</p>

        {stage === "success" ? (
          <div role="status" className="mt-7 border border-emerald-700/35 bg-emerald-950/20 p-6 text-center">
            <Check className="mx-auto h-6 w-6 text-emerald-300" />
            <h2 className="font-display mt-3 text-xl">Access confirmed.</h2>
            <p className="mt-2 text-xs leading-6 text-[var(--color-bone-muted)]">{message}</p>
          </div>
        ) : stage === "code" || stage === "verifying" ? (
          <form onSubmit={verifyCode} className="mt-7" noValidate>
            <div role="status" className="rounded-lg border border-[var(--color-brass)]/20 bg-[var(--color-brass)]/5 px-4 py-3 text-xs leading-5 text-[var(--color-bone-muted)]">{message || "Enter the code sent to your email."}</div>
            <p className="mt-4 text-center text-xs text-[var(--color-bone-muted)]">Code sent to <strong className="text-[var(--color-bone)]">{email}</strong></p>
            <fieldset disabled={busy} className="mt-5">
              <legend className="sr-only">Six-digit verification code</legend>
              <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => { inputs.current[index] = element; }}
                    value={digit}
                    onChange={(event) => updateDigit(index, event.target.value)}
                    onKeyDown={(event) => handleKey(index, event)}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    aria-label={`Verification digit ${index + 1}`}
                    className="h-14 min-w-0 rounded-lg border border-[var(--color-ink-line)] bg-[#111] text-center font-display text-2xl text-[var(--color-bone)] outline-none transition focus:border-[var(--color-brass)] focus:ring-2 focus:ring-[var(--color-brass)]/25"
                    maxLength={1}
                  />
                ))}
              </div>
            </fieldset>
            {error ? <p role="alert" className="mt-4 text-center text-xs leading-5 text-red-300">{error}</p> : null}
            <button type="submit" disabled={busy || code.length !== OTP_LENGTH} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brass)] px-6 py-3.5 text-[10px] tracking-[.2em] uppercase text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{busy ? "Verifying" : "Verify and continue"}
            </button>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-[10px] tracking-[.12em] uppercase text-[var(--color-bone-muted)]">
              <button type="button" onClick={() => requestCode()} disabled={countdown > 0 || busy} className="inline-flex items-center gap-2 hover:text-[var(--color-brass)] disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />{countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}</button>
              <button type="button" onClick={changeEmail} disabled={busy} className="hover:text-[var(--color-brass)]">Change email</button>
            </div>
          </form>
        ) : (
          <form onSubmit={requestCode} className="mt-7" noValidate>
            <label className="block">
              <span className="form-label">Email</span>
              <input className="form-control" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-describedby="email-security-note" />
            </label>
            <p id="email-security-note" className="mt-3 text-[11px] leading-5 text-[var(--color-bone-muted)]">For privacy, the response is the same whether an account already exists or is created after verification.</p>
            {error ? <p role="alert" className="mt-4 text-center text-xs leading-5 text-red-300">{error}</p> : null}
            <button type="submit" disabled={busy || !email.trim()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brass)] px-6 py-3.5 text-[10px] tracking-[.2em] uppercase text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50">
              {stage === "sending" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{stage === "sending" ? "Sending code" : "Email me a secure code"}
            </button>
          </form>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] text-[var(--color-bone-muted)]">
          <Link href="/privacy" className="hover:text-[var(--color-brass)]">Privacy</Link>
          <Link href="/contact" className="hover:text-[var(--color-brass)]">Need help?</Link>
        </div>
      </section>
    </main>
  );
}
