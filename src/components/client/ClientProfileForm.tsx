"use client";

import { useState } from "react";
import styles from "./client-portal.module.css";

type Props = {
  initial: {
    fullName: string;
    phone: string;
    preferredLanguage: "en" | "es";
    groomingPreferences: Record<string, unknown>;
    marketingStatus: "unknown" | "subscribed" | "unsubscribed";
  };
};

function preference(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function ClientProfileForm({ initial }: Props) {
  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone);
  const [preferredLanguage, setPreferredLanguage] = useState(initial.preferredLanguage);
  const [marketingStatus, setMarketingStatus] = useState(initial.marketingStatus);
  const [haircut, setHaircut] = useState(preference(initial.groomingPreferences.haircut));
  const [fade, setFade] = useState(preference(initial.groomingPreferences.fade));
  const [beard, setBeard] = useState(preference(initial.groomingPreferences.beard));
  const [sensitivities, setSensitivities] = useState(preference(initial.groomingPreferences.sensitivities));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setMessage("");
    const response = await fetch("/api/client/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName,
        phone,
        preferredLanguage,
        marketingStatus,
        groomingPreferences: {
          ...initial.groomingPreferences,
          haircut,
          fade,
          beard,
          sensitivities,
        },
      }),
    }).catch(() => null);
    if (!response?.ok) {
      const body = await response?.json().catch(() => null) as { message?: string } | null;
      setState("error");
      setMessage(body?.message ?? "Your profile could not be updated. Please try again.");
      return;
    }
    setState("saved");
    setMessage("Your profile was updated.");
  }

  return <form onSubmit={submit} className={`${styles.card} grid gap-5`}>
    <div>
      <p className={styles.eyebrow}>Editable profile</p>
      <h2 className="font-display mt-2 text-2xl">Your details and grooming preferences</h2>
      <p className={`mt-2 text-sm leading-6 ${styles.muted}`}>Only authorized staff can use these details to prepare for your service.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name"><input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" maxLength={120} required /></Field>
      <Field label="Phone"><input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="tel" maxLength={30} /></Field>
      <Field label="Preferred language"><select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value as "en" | "es")}><option value="en">English</option><option value="es">Español</option></select></Field>
      <Field label="Email communication"><select value={marketingStatus} onChange={(event) => setMarketingStatus(event.target.value as Props["initial"]["marketingStatus"])}><option value="unknown">Transactional only</option><option value="subscribed">Include approved offers</option><option value="unsubscribed">No marketing email</option></select></Field>
      <Field label="Haircut preference"><input value={haircut} onChange={(event) => setHaircut(event.target.value)} maxLength={300} placeholder="Shape, length, finish" /></Field>
      <Field label="Fade preference"><input value={fade} onChange={(event) => setFade(event.target.value)} maxLength={300} placeholder="Low, mid, high, taper" /></Field>
      <Field label="Beard preference"><input value={beard} onChange={(event) => setBeard(event.target.value)} maxLength={300} placeholder="Length, shape, line detail" /></Field>
      <Field label="Sensitivities"><input value={sensitivities} onChange={(event) => setSensitivities(event.target.value)} maxLength={300} placeholder="Skin or product considerations" /></Field>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={state === "saving"} className="rounded-full bg-[var(--color-brass)] px-6 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)] disabled:opacity-60">{state === "saving" ? "Saving" : "Save profile"}</button>
      {message ? <p role="status" className={`text-sm ${state === "error" ? "text-red-300" : "text-[var(--color-bone-muted)]"}`}>{message}</p> : null}
    </div>
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-[9px] tracking-[.13em] uppercase text-[var(--color-bone-muted)]">{label}<span className="[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-[var(--color-ink-line)] [&>input]:bg-black/20 [&>input]:px-4 [&>input]:py-3 [&>input]:text-sm [&>input]:normal-case [&>input]:tracking-normal [&>input]:text-[var(--color-bone)] [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-[var(--color-ink-line)] [&>select]:bg-[#111] [&>select]:px-4 [&>select]:py-3 [&>select]:text-sm [&>select]:normal-case [&>select]:tracking-normal [&>select]:text-[var(--color-bone)]">{children}</span></label>;
}
