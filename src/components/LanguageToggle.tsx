"use client";

import clsx from "clsx";
import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const switchAria =
    lang === "en"
      ? dict.langToggle.switchToEs.en
      : dict.langToggle.switchToEn.en;

  return (
    <div
      role="group"
      aria-label={dict.langToggle.label[lang]}
      className={clsx(
        "inline-flex items-center rounded-full border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)] p-0.5 text-[11px] tracking-[0.18em] uppercase",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        aria-label={dict.langToggle.switchToEn.en}
        className={clsx(
          "rounded-full px-3 py-1 transition-colors",
          lang === "en"
            ? "bg-[var(--color-brass)] text-[var(--color-ink)]"
            : "text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]",
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("es")}
        aria-pressed={lang === "es"}
        aria-label={dict.langToggle.switchToEs.en}
        className={clsx(
          "rounded-full px-3 py-1 transition-colors",
          lang === "es"
            ? "bg-[var(--color-brass)] text-[var(--color-ink)]"
            : "text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]",
        )}
      >
        ES
      </button>
      <span className="sr-only">{switchAria}</span>
    </div>
  );
}
