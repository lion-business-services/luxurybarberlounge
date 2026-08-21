"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useLang } from "@/lib/i18n/context";

type Bilingual = { en?: string; es?: string } | null;

type Profile = {
  id: string;
  display_name: string;
  professional_title: Bilingual;
  short_intro: Bilingual;
  biography: Bilingual;
  specialties: string[] | null;
  languages: string[] | null;
  accepting_walk_ins: boolean;
  availability_status: string;
  portal_email: string | null;
};

const copy = {
  en: {
    heading: "Your profile",
    intro: "This is what clients see on your public page. Changes appear on the website once saved.",
    title: "Professional title",
    short: "Short introduction",
    bio: "Biography",
    specialties: "Specialties (comma separated)",
    languages: "Languages (comma separated)",
    walkins: "I accept walk-in clients",
    status: "Current availability",
    save: "Save profile",
    saved: "Your profile has been updated.",
    english: "English",
    spanish: "Spanish",
    statusOptions: { available: "Available", busy: "Busy", unavailable: "Unavailable" },
  },
  es: {
    heading: "Tu perfil",
    intro: "Esto es lo que los clientes ven en tu página pública. Los cambios aparecen en el sitio al guardar.",
    title: "Título profesional",
    short: "Presentación breve",
    bio: "Biografía",
    specialties: "Especialidades (separadas por comas)",
    languages: "Idiomas (separados por comas)",
    walkins: "Acepto clientes sin cita",
    status: "Disponibilidad actual",
    save: "Guardar perfil",
    saved: "Tu perfil se ha actualizado.",
    english: "Inglés",
    spanish: "Español",
    statusOptions: { available: "Disponible", busy: "Ocupado", unavailable: "No disponible" },
  },
} as const;

export function BarberProfileEditor() {
  const { lang } = useLang();
  const t = copy[lang] ?? copy.en;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [titleEn, setTitleEn] = useState("");
  const [titleEs, setTitleEs] = useState("");
  const [shortEn, setShortEn] = useState("");
  const [shortEs, setShortEs] = useState("");
  const [bioEn, setBioEn] = useState("");
  const [bioEs, setBioEs] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [languages, setLanguages] = useState("");
  const [walkIns, setWalkIns] = useState(false);
  const [status, setStatus] = useState("available");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/barber/profile", { cache: "no-store" });
      const result = await response.json();
      if (!result.ok) {
        setMessage(result.message ?? "Profile unavailable.");
        return;
      }
      const p: Profile = result.profile;
      setProfile(p);
      setTitleEn(p.professional_title?.en ?? "");
      setTitleEs(p.professional_title?.es ?? "");
      setShortEn(p.short_intro?.en ?? "");
      setShortEs(p.short_intro?.es ?? "");
      setBioEn(p.biography?.en ?? "");
      setBioEs(p.biography?.es ?? "");
      setSpecialties((p.specialties ?? []).join(", "));
      setLanguages((p.languages ?? []).join(", "));
      setWalkIns(Boolean(p.accepting_walk_ins));
      setStatus(p.availability_status ?? "available");
    } catch {
      setMessage("Profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/barber/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          professionalTitle: { en: titleEn, es: titleEs },
          shortIntro: { en: shortEn, es: shortEs },
          biography: { en: bioEn, es: bioEs },
          specialties: specialties.split(",").map((v) => v.trim()).filter(Boolean),
          languages: languages.split(",").map((v) => v.trim()).filter(Boolean),
          acceptingWalkIns: walkIns,
          availabilityStatus: status,
        }),
      });
      const result = await response.json();
      setMessage(result.ok ? t.saved : result.message ?? "Could not save.");
    } catch {
      setMessage("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <section className="portal-card"><p className="text-sm text-[var(--color-bone-muted)]">Loading…</p></section>;
  }
  if (!profile) {
    return <section className="portal-card"><p className="text-sm text-[var(--color-bone-muted)]">{message || "Profile unavailable."}</p></section>;
  }

  const field = "min-h-11 w-full rounded-lg border border-[var(--color-ink-line)] bg-transparent px-3 text-sm text-[var(--color-bone)]";
  const label = "text-[9px] tracking-[.16em] uppercase text-[var(--color-brass)]";

  return (
    <section className="portal-card">
      <h2 className="font-display text-2xl">{t.heading}</h2>
      <p className="mt-1 text-sm text-[var(--color-bone-muted)]">{t.intro}</p>
      <p className="mt-2 text-xs text-[var(--color-bone-muted)]">{profile.display_name} · {profile.portal_email}</p>

      <div className="mt-6 grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={label}>{t.title} · {t.english}</span>
            <input className={field} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className={label}>{t.title} · {t.spanish}</span>
            <input className={field} value={titleEs} onChange={(e) => setTitleEs(e.target.value)} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={label}>{t.short} · {t.english}</span>
            <textarea className={`${field} min-h-20 py-2`} value={shortEn} onChange={(e) => setShortEn(e.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className={label}>{t.short} · {t.spanish}</span>
            <textarea className={`${field} min-h-20 py-2`} value={shortEs} onChange={(e) => setShortEs(e.target.value)} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={label}>{t.bio} · {t.english}</span>
            <textarea className={`${field} min-h-32 py-2`} value={bioEn} onChange={(e) => setBioEn(e.target.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className={label}>{t.bio} · {t.spanish}</span>
            <textarea className={`${field} min-h-32 py-2`} value={bioEs} onChange={(e) => setBioEs(e.target.value)} />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className={label}>{t.specialties}</span>
          <input className={field} value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Skin fades, beard sculpting, hot towel shaves" />
        </label>

        <label className="grid gap-1.5">
          <span className={label}>{t.languages}</span>
          <input className={field} value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Español" />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={label}>{t.status}</span>
            <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
              {(["available", "busy", "unavailable"] as const).map((value) => (
                <option key={value} value={value}>{t.statusOptions[value]}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm sm:mt-6">
            <input type="checkbox" checked={walkIns} onChange={(e) => setWalkIns(e.target.checked)} />
            <span>{t.walkins}</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="inline-flex w-fit min-h-12 items-center gap-2 rounded-full bg-[var(--color-brass)] px-6 text-[10px] tracking-[.16em] uppercase text-black disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t.save}
        </button>

        {message ? <p className="text-xs text-[var(--color-bone-muted)]">{message}</p> : null}
      </div>
    </section>
  );
}
