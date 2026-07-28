"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search, Clock3, Sparkles } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D, TiltCard } from "@/components/motion";
import { useLang } from "@/lib/i18n/context";
import { copy, serviceCategories, services } from "@/lib/content/site";

export function ServicesView() {
  const { lang } = useLang();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return services.filter((service) => {
      const matchesCategory = category === "all" || service.category === category;
      const haystack = `${service.name[lang]} ${service.blurb[lang]} ${service.tags.join(" ")}`.toLowerCase();
      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [category, lang, query]);

  return (
    <>
      <PageHero eyebrow={copy.services.eyebrow} title={copy.services.title} lead={copy.services.lead} />
      <Scene3D className="mx-auto max-w-7xl px-6 pb-28 sm:px-10">
        <Reveal variant="fade">
          <div className="mb-12 grid gap-5 border-y border-[var(--color-ink-line)] py-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="relative block max-w-xl">
              <span className="sr-only">Search services</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-brass)]" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={lang === "es" ? "Buscar por servicio o resultado" : "Search by service or result"}
                className="h-12 w-full border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)] pl-11 pr-4 text-sm text-[var(--color-bone)] outline-none transition focus:border-[var(--color-brass)]"
              />
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Service categories">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={category === "all" ? "filter-pill filter-pill-active" : "filter-pill"}
              >
                {lang === "es" ? "Todos" : "All"}
              </button>
              {serviceCategories.map((item) => (
                <button
                  type="button"
                  key={item.slug}
                  onClick={() => setCategory(item.slug)}
                  className={category === item.slug ? "filter-pill filter-pill-active" : "filter-pill"}
                >
                  {item.name[lang]}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--color-bone-muted)]">
            {filtered.length} {lang === "es" ? "servicios" : "services"}
          </p>
          <Link href="/book" className="text-[10px] tracking-[0.28em] uppercase text-[var(--color-brass)] hover:text-[var(--color-brass-light)]">
            {lang === "es" ? "Ayúdame a elegir" : "Help me choose"} →
          </Link>
        </div>

        {filtered.length ? (
          <ul className="grid gap-px overflow-hidden bg-[var(--color-ink-line)] sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((service, index) => (
              <li key={service.slug}>
                <Reveal delay={(index % 6) * 55} className="block h-full">
                  <TiltCard max={4} className="h-full">
                    <article className="group flex h-full min-h-[340px] flex-col justify-between bg-[var(--color-ink)] p-7 transition-colors duration-500 hover:bg-[var(--color-ink-soft)]">
                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[9px] tracking-[0.26em] uppercase text-[var(--color-brass)]">
                            {serviceCategories.find((item) => item.slug === service.category)?.name[lang]}
                          </span>
                          {service.featured ? <Sparkles className="h-4 w-4 text-[var(--color-brass)]" aria-label="Featured" /> : null}
                        </div>
                        <h2 className="font-display mt-5 text-2xl tracking-tight text-[var(--color-bone)]">
                          {service.name[lang]}
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-[var(--color-bone-muted)]">
                          {service.blurb[lang]}
                        </p>
                      </div>
                      <div className="mt-8 border-t border-[var(--color-ink-line)] pt-5">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[var(--color-bone-muted)]">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden /> {service.minutes} {copy.common.minutes[lang]}
                          </span>
                          <span className="font-display text-xl text-[var(--color-brass)]">
                            {copy.common.from[lang]} ${service.from}
                          </span>
                        </div>
                        <div className="mt-5 flex items-center justify-between">
                          <Link href={`/services/${service.slug}`} className="text-[10px] tracking-[0.24em] uppercase text-[var(--color-bone-muted)] transition hover:text-[var(--color-brass)]">
                            {lang === "es" ? "Ver detalles" : "View details"}
                          </Link>
                          <Link
                            href={`/book?service=${service.slug}`}
                            data-magnetic="true"
                            aria-label={`${copy.common.book[lang]} — ${service.name[lang]}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-ink-line)] text-[var(--color-brass)] transition hover:border-[var(--color-brass)]"
                          >
                            <ArrowUpRight className="h-4 w-4" aria-hidden />
                          </Link>
                        </div>
                      </div>
                    </article>
                  </TiltCard>
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border border-[var(--color-ink-line)] p-12 text-center">
            <h2 className="font-display text-2xl">{lang === "es" ? "No encontramos ese servicio" : "No service matched that search"}</h2>
            <p className="mt-3 text-sm text-[var(--color-bone-muted)]">{lang === "es" ? "Prueba otra palabra o muestra todas las categorías." : "Try a different word or return to all categories."}</p>
          </div>
        )}
      </Scene3D>
    </>
  );
}
