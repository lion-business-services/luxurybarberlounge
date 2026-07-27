"use client";

import { PageHero } from "@/components/PageHero";
import { Reveal, Scene3D, Layer, CountUp } from "@/components/motion";
import { useLang } from "@/lib/i18n/context";
import { barbers, copy, services } from "@/lib/content/site";

export function AboutView() {
  const { lang } = useLang();

  const stats = [
    { label: { en: "Cuts", es: "Cortes" }, value: services.length },
    { label: { en: "Chairs", es: "Sillas" }, value: barbers.length },
  ];

  return (
    <>
      <PageHero
        eyebrow={copy.about.eyebrow}
        title={copy.about.title}
        lead={copy.about.lead}
      />

      <Scene3D className="mx-auto max-w-6xl px-6 pb-28 sm:px-10">
        <div className="grid gap-14 md:grid-cols-12">
          <Reveal className="md:col-span-7">
            <p className="text-lg leading-relaxed text-[var(--color-bone)]/85">
              {copy.about.body[lang]}
            </p>
          </Reveal>

          <Layer z={80} tilt={3} drift={22} className="md:col-span-5">
            <Reveal delay={140} variant="right">
              <div className="border-l border-[var(--color-ink-line)] pl-7">
                <dl className="grid grid-cols-2 gap-y-8 text-[11px] tracking-[0.24em] uppercase">
                  {stats.map((stat) => (
                    <div key={stat.label.en}>
                      <dt className="text-[var(--color-bone-muted)]">{stat.label[lang]}</dt>
                      <dd className="font-display mt-2 text-3xl tracking-tight text-[var(--color-brass)]">
                        <CountUp value={stat.value} />
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-[var(--color-bone-muted)]">
                      {lang === "es" ? "Servicio" : "Service"}
                    </dt>
                    <dd className="font-display mt-2 text-base italic text-[var(--color-bone)]">
                      {lang === "es" ? "Con cita" : "By appointment"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-bone-muted)]">
                      {lang === "es" ? "Idiomas" : "Languages"}
                    </dt>
                    <dd className="font-display mt-2 text-base italic text-[var(--color-bone)]">
                      EN · ES
                    </dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          </Layer>
        </div>
      </Scene3D>
    </>
  );
}
