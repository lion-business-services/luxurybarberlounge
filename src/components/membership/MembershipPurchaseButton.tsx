"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";

/**
 * Starts a real Square checkout for a membership.
 *
 * Collects the minimum needed to create the Square customer that the recurring
 * subscription will be attached to. Card details are entered on Square's hosted
 * checkout, never here.
 */
export function MembershipPurchaseButton({
  planSlug,
  featured,
  className,
  lang = "en",
}: {
  planSlug: string;
  featured?: boolean;
  className?: string;
  lang?: "en" | "es";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const t = {
    en: {
      join: "Become a member",
      title: "Start your membership",
      copy: "Payment is handled securely by Square. Your card is stored by Square for the recurring charge — never by us.",
      name: "Full name",
      email: "Email",
      phone: "Phone (optional)",
      go: "Continue to secure payment",
      cancel: "Cancel",
      error: "Please enter your name and a valid email.",
    },
    es: {
      join: "Hazte miembro",
      title: "Comienza tu membresía",
      copy: "El pago lo procesa Square de forma segura. Tu tarjeta la guarda Square para el cobro recurrente — nunca nosotros.",
      name: "Nombre completo",
      email: "Correo electrónico",
      phone: "Teléfono (opcional)",
      go: "Continuar al pago seguro",
      cancel: "Cancelar",
      error: "Ingresa tu nombre y un correo válido.",
    },
  }[lang];

  async function start() {
    if (name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError(t.error);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planSlug, name: name.trim(), email: email.trim(), phone: phone.trim() || undefined }),
      });
      const result = await response.json();
      if (result.ok && result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.message ?? "Checkout could not be started.");
    } catch {
      setError("Checkout could not be started.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {t.join}
        <ArrowUpRight size={15} />
      </button>
    );
  }

  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-[var(--color-brass)]/40 bg-black/40 p-4">
      <p className="text-[10px] uppercase tracking-[.2em] text-[var(--color-brass)]">{t.title}</p>
      <p className="text-xs leading-6 text-[var(--color-bone-muted)]">{t.copy}</p>

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t.name}
        autoComplete="name"
        className="min-h-11 rounded-lg border border-[var(--color-ink-line)] bg-transparent px-3 text-sm text-[var(--color-bone)]"
      />
      <input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t.email}
        type="email"
        autoComplete="email"
        className="min-h-11 rounded-lg border border-[var(--color-ink-line)] bg-transparent px-3 text-sm text-[var(--color-bone)]"
      />
      <input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder={t.phone}
        type="tel"
        autoComplete="tel"
        className="min-h-11 rounded-lg border border-[var(--color-ink-line)] bg-transparent px-3 text-sm text-[var(--color-bone)]"
      />

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[10px] uppercase tracking-[.16em] disabled:opacity-40 ${
            featured
              ? "bg-[var(--color-brass)] text-black"
              : "border border-[var(--color-brass)] text-[var(--color-brass)]"
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t.go}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-ink-line)] px-4 text-[10px] uppercase tracking-[.16em] text-[var(--color-bone-muted)]"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
