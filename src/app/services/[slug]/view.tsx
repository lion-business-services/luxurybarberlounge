"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Clock3, DollarSign, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D } from "@/components/motion";
import { LuxuryCard } from "@/components/marketing/LuxuryCard";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { useLang } from "@/lib/i18n/context";
import { serviceCategories, services, type Service } from "@/lib/content/site";

export function ServiceDetailView({ service }: { service: Service }) {
  const { lang } = useLang();
  const related = services.filter((item) => item.category === service.category && item.slug !== service.slug).slice(0, 3);
  const category = serviceCategories.find((item) => item.slug === service.category);

  return (
    <>
      <PageHero
        eyebrow={category?.name ?? { en: "Service", es: "Servicio" }}
        title={service.name}
        lead={service.blurb}
      >
        <Reveal delay={300} className="mt-9 flex flex-wrap gap-3">
          <span className="detail-chip"><Clock3 className="h-4 w-4" /> {service.minutes} min</span>
          <span className="detail-chip"><DollarSign className="h-4 w-4" /> {lang === "es" ? "Desde" : "From"} ${service.from}</span>
          <span className="detail-chip"><ShieldCheck className="h-4 w-4" /> ${service.deposit} {lang === "es" ? "depósito" : "deposit"}</span>
        </Reveal>
      </PageHero>

      <Scene3D className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_.65fr]">
          <Reveal>
            <LuxuryCard className="h-full p-8 sm:p-10" elevated>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-brass)]">{lang === "es" ? "El servicio" : "The service"}</p>
              <p className="font-display mt-5 text-2xl leading-relaxed text-[var(--color-bone)] sm:text-3xl">{service.description[lang]}</p>
              <div className="mt-10 grid gap-7 border-t border-[var(--color-ink-line)] pt-8 sm:grid-cols-2">
                <div>
                  <h2 className="text-[10px] tracking-[0.28em] uppercase text-[var(--color-brass)]">{lang === "es" ? "Antes de llegar" : "Before you arrive"}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-bone-muted)]">{service.preparation[lang]}</p>
                </div>
                <div>
                  <h2 className="text-[10px] tracking-[0.28em] uppercase text-[var(--color-brass)]">{lang === "es" ? "Mantenimiento" : "Maintenance"}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-bone-muted)]">{service.maintenance[lang]}</p>
                </div>
              </div>
            </LuxuryCard>
          </Reveal>

          <Reveal delay={100}>
            <LuxuryCard className="h-full p-8">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--color-brass)]">{lang === "es" ? "Incluye" : "What to expect"}</p>
              <ul className="mt-6 space-y-4">
                {service.benefits.map((benefit) => (
                  <li key={benefit.en} className="flex gap-3 text-sm leading-6 text-[var(--color-bone)]/85">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden />
                    {benefit[lang]}
                  </li>
                ))}
              </ul>
              <Link href={`/book?service=${service.slug}`} data-magnetic="true" className="mt-9 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[var(--color-brass)] px-6 py-3.5 text-[11px] tracking-[0.24em] uppercase text-[var(--color-ink)] hover:bg-[var(--color-brass-light)]">
                {lang === "es" ? "Reservar este servicio" : "Reserve this service"}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </LuxuryCard>
          </Reveal>
        </div>

        {related.length ? (
          <section className="mt-20">
            <SectionHeading eyebrow={lang === "es" ? "También puedes considerar" : "You may also consider"} title={lang === "es" ? "Servicios relacionados" : "Related services"} />
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {related.map((item) => (
                <Link key={item.slug} href={`/services/${item.slug}`} className="group border border-[var(--color-ink-line)] p-6 transition hover:border-[var(--color-brass)]/50">
                  <h3 className="font-display text-xl group-hover:text-[var(--color-brass)]">{item.name[lang]}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-bone-muted)]">{item.blurb[lang]}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </Scene3D>
    </>
  );
}
