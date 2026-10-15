"use client";

import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";

const href = "https://vyntexusa.com/?utm_source=luxurybarberlounge&utm_medium=footer_credit";

/** Small "site built by" credit for the agency that built and maintains this website. */
export function VyntexCredit() {
  const { lang } = useLang();
  return (
    <div className="mx-auto max-w-7xl px-6 pb-8 sm:px-10">
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className="group flex w-full items-center gap-2.5 rounded-xl border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)] px-3 py-1.5 text-[11px] sm:rounded-full leading-5 text-[var(--color-bone-muted)] transition hover:border-[#00ddff]/40 sm:w-fit"
      >
        <span
          aria-hidden="true"
          className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border border-[#00ddff]/50 bg-black text-[10px] font-extrabold leading-none text-transparent shadow-[0_0_6px_rgba(0,221,255,.35)]"
        >
          <span className="bg-gradient-to-b from-white to-[#a3a6ae] bg-clip-text">V</span>
        </span>
        <span className="min-w-0 flex-1">
          {dict.footer.credit[lang]} <strong className="font-semibold tracking-wide text-[var(--color-bone)]">VYNTEX USA</strong>
        </span>
        <span className="shrink-0 text-[#00ddff] transition group-hover:translate-x-0.5">vyntexusa.com →</span>
      </a>
    </div>
  );
}
