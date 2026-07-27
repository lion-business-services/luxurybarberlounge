"use client";

import type { ReactNode } from "react";
import { Reveal, Scene3D, Layer } from "@/components/motion";
import { useLang } from "@/lib/i18n/context";
import { copy, type Bi } from "@/lib/content/site";

/**
 * Editorial page header used by every interior page.
 * The eyebrow, title, and rule arrive in sequence; the whole block sits on a
 * 3D layer that settles flat as it reaches the centre of the viewport.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: Bi;
  title: Bi;
  lead: Bi;
  children?: ReactNode;
}) {
  const { lang } = useLang();

  return (
    <Scene3D className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_-15%,rgba(184,134,42,0.12),transparent_55%),radial-gradient(circle_at_88%_115%,rgba(114,47,55,0.16),transparent_60%)]"
      />
      <Layer z={60} tilt={2.2} drift={18}>
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-10 sm:px-10 md:pt-28">
          <Reveal variant="fade">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brass)]/40 px-3 py-1 text-[10px] tracking-[0.32em] uppercase text-[var(--color-brass)]">
              <span className="h-1 w-1 rounded-full bg-[var(--color-brass)]" aria-hidden />
              {eyebrow[lang]}
            </span>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="font-display mt-7 text-5xl leading-[1.03] tracking-tight text-[var(--color-bone)] md:text-7xl">
              {title[lang]}
            </h1>
          </Reveal>

          <Reveal delay={180} className="block">
            <div className="hairline my-9 max-w-[140px]" />
          </Reveal>

          <Reveal delay={240}>
            <p className="font-display max-w-xl text-xl leading-relaxed italic text-[var(--color-bone)]/85 md:text-2xl">
              {lead[lang]}
            </p>
          </Reveal>

          {children}

          <Reveal delay={340} variant="fade">
            <p className="mt-10 flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase text-[var(--color-bone-muted)]">
              <span className="lbl-scrollcue" aria-hidden />
              {copy.common.scrollHint[lang]}
            </p>
          </Reveal>
        </div>
      </Layer>
    </Scene3D>
  );
}
