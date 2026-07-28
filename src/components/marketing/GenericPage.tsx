import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D } from "@/components/motion";
import { LuxuryCard } from "./LuxuryCard";
import { SectionHeading } from "./SectionHeading";

export type GenericPageSection = {
  title: string;
  copy: string;
  bullets?: string[];
};

export function GenericPage({
  eyebrow,
  title,
  lead,
  sections,
  cta,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  sections: GenericPageSection[];
  cta?: { label: string; href: string; copy?: string };
}) {
  return (
    <>
      <PageHero
        eyebrow={{ en: eyebrow, es: eyebrow }}
        title={{ en: title, es: title }}
        lead={{ en: lead, es: lead }}
      />
      <Scene3D className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section, index) => (
            <Reveal key={section.title} delay={index * 70} className="h-full">
              <LuxuryCard className="h-full" elevated={index === 0}>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-brass)]">
                  0{index + 1}
                </p>
                <h2 className="font-display mt-4 text-2xl text-[var(--color-bone)]">
                  {section.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">
                  {section.copy}
                </p>
                {section.bullets?.length ? (
                  <ul className="mt-6 space-y-3 border-t border-[var(--color-ink-line)] pt-5 text-sm text-[var(--color-bone)]/80">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--color-brass)]" aria-hidden />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </LuxuryCard>
            </Reveal>
          ))}
        </div>
        {cta ? (
          <Reveal className="mt-16">
            <div className="border border-[var(--color-brass)]/30 bg-[var(--color-oxblood)]/10 px-7 py-10 text-center sm:px-12">
              <SectionHeading
                align="center"
                eyebrow="Your next visit"
                title="Make the chair yours."
                copy={cta.copy ?? "Choose a service, preferred barber, and the most convenient way to reserve."}
              />
              <Link
                href={cta.href}
                data-magnetic="true"
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-7 py-3.5 text-[11px] tracking-[0.24em] uppercase text-[var(--color-ink)] transition hover:bg-[var(--color-brass-light)]"
              >
                {cta.label}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        ) : null}
      </Scene3D>
    </>
  );
}
