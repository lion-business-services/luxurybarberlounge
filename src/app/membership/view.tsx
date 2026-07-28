"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import clsx from "clsx";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D, Layer, TiltCard } from "@/components/motion";
import { useLang } from "@/lib/i18n/context";
import { copy, tiers } from "@/lib/content/site";

export function MembershipView() {
  const { lang } = useLang();

  return (
    <>
      <PageHero
        eyebrow={copy.membership.eyebrow}
        title={copy.membership.title}
        lead={copy.membership.lead}
      />

      <Scene3D className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <ul className="grid gap-8 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <li key={tier.slug}>
              <Reveal delay={i * 90} className="block h-full">
                <TiltCard max={6} className="h-full">
                  <article
                    className={clsx(
                      "flex h-full flex-col border bg-[var(--color-ink)] p-8 transition-colors duration-500",
                      tier.featured
                        ? "border-[var(--color-brass)]/55"
                        : "border-[var(--color-ink-line)] hover:border-[var(--color-brass)]/35",
                    )}
                  >
                    {tier.featured && (
                      <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-brass)]/45 px-3 py-1 text-[10px] tracking-[0.3em] uppercase text-[var(--color-brass)]">
                        <span className="h-1 w-1 rounded-full bg-[var(--color-brass)]" aria-hidden />
                        {lang === "es" ? "Más elegida" : "Most chosen"}
                      </span>
                    )}

                    <h2 className="font-display text-3xl tracking-tight text-[var(--color-bone)]">
                      {tier.name[lang]}
                    </h2>

                    <p className="mt-5 flex items-baseline gap-2">
                      <span className="font-display text-4xl tracking-tight text-[var(--color-brass)]">
                        ${tier.price}
                      </span>
                      <span className="text-[11px] tracking-[0.24em] uppercase text-[var(--color-bone-muted)]">
                        {tier.cadence[lang]}
                      </span>
                    </p>

                    <div className="hairline my-7" />

                    <ul className="flex-1 space-y-3">
                      {tier.perks.map((perk) => (
                        <li key={perk.en} className="flex gap-3 text-sm leading-relaxed text-[var(--color-bone)]/80">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden />
                          <span>{perk[lang]}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`/book?membership=${tier.slug}`}
                      data-magnetic
                      className={clsx(
                        "mt-9 inline-flex items-center justify-center gap-3 rounded-full px-6 py-3 text-[11px] tracking-[0.24em] uppercase transition-colors duration-300",
                        tier.featured
                          ? "bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-light)]"
                          : "border border-[var(--color-ink-line)] text-[var(--color-bone)] hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]",
                      )}
                    >
                      {copy.common.book[lang]}
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </article>
                </TiltCard>
              </Reveal>
            </li>
          ))}
        </ul>

        <Layer z={-120} drift={26}>
          <Reveal variant="fade" className="block">
            <p className="mt-10 max-w-2xl text-sm leading-relaxed text-[var(--color-bone-muted)]">
              {copy.membership.note[lang]}
            </p>
            <p className="mt-3 text-[11px] tracking-[0.26em] uppercase text-[var(--color-bone-muted)]">
            </p>
          </Reveal>
        </Layer>
      </Scene3D>
    </>
  );
}
