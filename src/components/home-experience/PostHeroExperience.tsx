"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  Phone,
  Scissors,
} from "lucide-react";
import { useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { useLang } from "@/lib/i18n/context";
import { barbers, business, hours, services, tiers, type Lang } from "@/lib/content/site";
import { homeMotion } from "@/lib/motion/homeMotionConfig";
import { experienceCopy, homeMedia, processSteps } from "./homeExperienceData";
import { useAdaptiveScrollProgress, useMotionTier, useVideoVisibility } from "./useHomeExperience";
import styles from "./home-experience.module.css";

const reveal = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.78, ease: homeMotion.ease } },
};

function CopyBlock({
  eyebrow,
  title,
  body,
  children,
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  body?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.28 }}
      variants={reveal}
    >
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={`${styles.heading} mt-6`}>{title}</h2>
      {body ? <p className={`${styles.subheading} mt-6`}>{body}</p> : null}
      {children}
    </motion.div>
  );
}

function SpiralGuide({ progress }: { progress: MotionValue<number> }) {
  const path =
    "M500 0 C900 260 930 780 520 1010 C120 1230 90 1750 510 1980 C920 2200 930 2760 500 3000 C110 3220 110 3740 510 3970 C910 4200 910 4740 500 4980 C130 5210 120 5680 500 6200";
  return (
    <svg className={styles.spiral} viewBox="0 0 1000 6200" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <motion.path
        d={path}
        fill="none"
        stroke="rgba(226,193,125,.52)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        style={{ pathLength: progress }}
      />
    </svg>
  );
}

function ThresholdScene({ lang, tier }: { lang: Lang; tier: ReturnType<typeof useMotionTier> }) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = tier === "reduced";
  const useMobileMedia = tier === "mobile";
  const useVideo = tier !== "reduced";
  useVideoVisibility(videoRef, useVideo);
  const scrollYProgress = useAdaptiveScrollProgress(ref, !reduced, "pinned");
  const smooth = useSpring(scrollYProgress, homeMotion.softSpring);
  const scale = useTransform(smooth, [0, 0.72, 1], [0.84, 1, 1.035]);
  const radius = useTransform(smooth, [0, 0.7], [44, 0]);
  const copyY = useTransform(smooth, [0, 1], [42, -38]);
  const copyOpacity = useTransform(smooth, [0, 0.76, 1], [1, 1, 0.28]);
  const ringRotate = useTransform(smooth, [0, 1], [0, 76]);
  const ringScale = useTransform(smooth, [0, 1], [0.82, 1.18]);

  return (
    <section ref={ref} className={`${styles.scene} ${styles.threshold}`} aria-labelledby="threshold-title">
      <div className={styles.thresholdSticky}>
        <motion.div className={styles.videoFrame} style={reduced ? undefined : { scale, borderRadius: radius }}>
          {useVideo && !reduced ? (
            <video
              ref={videoRef}
              muted
              playsInline
              loop
              preload={tier === "high" ? "metadata" : "none"}
              poster={useMobileMedia ? homeMedia.thresholdMobilePoster : homeMedia.thresholdPoster}
              aria-label="Cinematic view of the Luxury Barber Lounge interior"
            >
              {!useMobileMedia ? <source src={homeMedia.thresholdWebm} type="video/webm" /> : null}
              <source src={useMobileMedia ? homeMedia.thresholdMobileMp4 : homeMedia.thresholdMp4} type="video/mp4" />
            </video>
          ) : (
            <Image src={useMobileMedia ? homeMedia.thresholdMobilePoster : homeMedia.thresholdPoster} alt="Luxury barber lounge interior" fill sizes="100vw" className="object-cover" />
          )}
        </motion.div>
        <motion.div className={styles.portalRing} style={reduced ? undefined : { rotate: ringRotate, scale: ringScale }} aria-hidden="true" />
        <motion.div className={styles.thresholdCopy} style={reduced ? undefined : { y: copyY, opacity: copyOpacity }}>
          <p className={styles.eyebrow}>{experienceCopy.threshold.eyebrow[lang]}</p>
          <h2 id="threshold-title" className={`${styles.heading} mt-6`}>{experienceCopy.threshold.title[lang]}</h2>
          <p className={`${styles.subheading} mt-6`}>{experienceCopy.threshold.body[lang]}</p>
          <div className={styles.actions}>
            <Link href="/book" data-magnetic="true" className={styles.primary}>{lang === "es" ? "Reservar una silla" : "Reserve a chair"}<ArrowUpRight size={15} /></Link>
            <Link href="/our-story" className={styles.secondary}>{lang === "es" ? "Nuestra historia" : "Our story"}<ArrowRight size={15} /></Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function MembershipScene({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const preferred = Math.max(0, tiers.findIndex((tier) => tier.featured));
  const [activeIndex, setActiveIndex] = useState(preferred);
  const active = tiers[activeIndex] ?? tiers[0];
  const ref = useRef<HTMLElement>(null);
  const scrollYProgress = useAdaptiveScrollProgress(ref, !reduced);
  const smooth = useSpring(scrollYProgress, homeMotion.softSpring);
  const ringRotate = useTransform(smooth, [0, 1], [-26, 42]);
  const ringScale = useTransform(smooth, [0, 0.5, 1], [0.86, 1, 1.08]);
  const atmosphereY = useTransform(smooth, [0, 1], [42, -34]);

  return (
    <section ref={ref} className={`${styles.scene} ${styles.membershipScene}`} aria-labelledby="membership-title">
      <motion.div className={styles.membershipAtmosphere} style={reduced ? undefined : { y: atmosphereY }} aria-hidden="true">
        <Image src={homeMedia.thresholdPoster} alt="" fill sizes="100vw" className="object-cover" />
      </motion.div>
      <motion.div className={styles.membershipOrbit} style={reduced ? undefined : { rotate: ringRotate, scale: ringScale }} aria-hidden="true">
        <span /><span /><span />
      </motion.div>
      <div className={`${styles.sceneInner} ${styles.membershipLayout}`}>
        <CopyBlock
          eyebrow={experienceCopy.membership.eyebrow[lang]}
          title={<span id="membership-title">{experienceCopy.membership.title[lang]}</span>}
          body={experienceCopy.membership.body[lang]}
        >
          <div className={styles.membershipTabs} role="tablist" aria-label={lang === "es" ? "Planes de membresía" : "Membership plans"}>
            {tiers.map((tier, index) => (
              <button
                key={tier.slug}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                aria-controls="membership-panel"
                className={activeIndex === index ? styles.membershipTabActive : styles.membershipTab}
                onClick={() => setActiveIndex(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {tier.name[lang]}
              </button>
            ))}
          </div>
        </CopyBlock>
        <div className={styles.membershipStage}>
          <AnimatePresence mode="wait">
            <motion.article
              id="membership-panel"
              role="tabpanel"
              key={active.slug}
              className={styles.membershipPanel}
              initial={reduced ? false : { opacity: 0, y: 22, rotateY: -3 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -16, rotateY: 3 }}
              transition={{ duration: 0.45, ease: homeMotion.ease }}
            >
              <p className={styles.eyebrow}>{active.featured ? (lang === "es" ? "Selección preferida" : "Preferred rhythm") : (lang === "es" ? "Concepto editable" : "Editable concept")}</p>
              <h3>{active.name[lang]}</h3>
              <p className={styles.membershipPrice}>${active.price}<small> / {active.cadence[lang]}</small></p>
              <p className={styles.membershipDescription}>{active.description[lang]}</p>
              <ul>{active.perks.map((perk) => <li key={perk.en}><Check size={15} />{perk[lang]}</li>)}</ul>
              <p className={styles.membershipNotice}>{lang === "es" ? "Consulta precios y beneficios actualizados al momento de tu visita." : "Confirm current pricing and benefits at the time of your visit."}</p>
              <div className={styles.actions}>
                <Link href="/membership" className={styles.primary}>{lang === "es" ? "Explorar membresía" : "Explore membership"}</Link>
                <Link href="/contact?topic=membership" className={styles.secondary}>{lang === "es" ? "Solicitar información" : "Request information"}</Link>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function PrecisionStep({ progress, range, item }: { progress: MotionValue<number>; range: [number, number, number]; item: readonly [string, string, string] }) {
  const opacity = useTransform(progress, range, [0.25, 1, 0.58]);
  const x = useTransform(progress, range, [22, 0, -10]);
  return <motion.div className={styles.step} style={{ opacity, x }}><span className={styles.stepNumber}>{item[0]}</span><div><h3>{item[1]}</h3><p>{item[2]}</p></div></motion.div>;
}

function PrecisionScene({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const scrollYProgress = useAdaptiveScrollProgress(ref, !reduced);
  const smooth = useSpring(scrollYProgress, homeMotion.spring);
  const imageAY = useTransform(smooth, [0, 1], [70, -50]);
  const imageARotate = useTransform(smooth, [0, 1], [-5, 1]);
  const imageBY = useTransform(smooth, [0, 1], [120, -80]);
  const imageBRotate = useTransform(smooth, [0, 1], [8, -3]);
  const orbRotate = useTransform(smooth, [0, 1], [0, 150]);
  const steps = processSteps[lang];
  return (
    <section ref={ref} className={`${styles.scene} ${styles.precisionScene}`} aria-labelledby="precision-title">
      <div className={`${styles.sceneInner} ${styles.precisionGrid}`}>
        <div className={styles.precisionVisual} aria-hidden="true">
          <motion.div className={`${styles.toolCard} ${styles.toolCardA}`} style={reduced ? undefined : { y: imageAY, rotate: imageARotate }}><Image src={homeMedia.toolsTray} alt="" fill sizes="(max-width: 760px) 90vw, 52vw" className="object-cover" /></motion.div>
          <motion.div className={`${styles.toolCard} ${styles.toolCardB}`} style={reduced ? undefined : { y: imageBY, rotate: imageBRotate }}><Image src={homeMedia.toolsStand} alt="" fill sizes="(max-width: 760px) 54vw, 24vw" className="object-cover" /></motion.div>
          <motion.div className={styles.toolOrb} style={reduced ? undefined : { rotate: orbRotate }} />
        </div>
        <div>
          <CopyBlock eyebrow={experienceCopy.precision.eyebrow[lang]} title={<span id="precision-title">{experienceCopy.precision.title[lang]}</span>} body={experienceCopy.precision.body[lang]} />
          <div className={styles.steps}>{steps.map((item, index) => { const center = 0.19 + index * 0.145; return <PrecisionStep key={item[0]} progress={smooth} range={[Math.max(0, center - 0.15), center, Math.min(1, center + 0.16)]} item={item} />; })}</div>
        </div>
      </div>
    </section>
  );
}

function SignatureServices({ lang }: { lang: Lang }) {
  const featured = useMemo(() => {
    const preferred = ["haircut", "skin-fade", "cut-and-beard", "beard", "hot-towel-shave", "line-up"];
    const selected = preferred.map((slug) => services.find((item) => item.slug === slug)).filter(Boolean);
    if (selected.length >= 6) return selected.slice(0, 6) as typeof services;
    return [...selected, ...services.filter((item) => !selected.includes(item))].slice(0, 6) as typeof services;
  }, []);
  const images = [homeMedia.toolsPair, homeMedia.toolsTray, homeMedia.toolsOrnate, homeMedia.toolsStand];
  return (
    <section className={`${styles.scene} ${styles.servicesScene}`} aria-labelledby="services-title">
      <div className={styles.sceneInner}>
        <div className={styles.servicesHeader}>
          <CopyBlock eyebrow={experienceCopy.services.eyebrow[lang]} title={<span id="services-title">{experienceCopy.services.title[lang]}</span>} />
          <Link href="/services" className={styles.secondary}>{lang === "es" ? "Ver todos los servicios" : "View all services"}<ArrowUpRight size={15} /></Link>
        </div>
        <div className={styles.serviceRail}>
          {featured.map((service, index) => (
            <motion.article
              key={service.slug}
              className={styles.serviceCard}
              style={{ "--service-image": `url(${images[index % images.length]})` } as CSSProperties}
              initial={{ opacity: 0, y: 42, rotateY: index % 2 ? -3 : 3 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ duration: 0.76, delay: Math.min(index * 0.05, 0.25), ease: homeMotion.ease }}
            >
              <span className={styles.serviceIndex}>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{service.name[lang]}</h3>
                <p>{service.blurb[lang]}</p>
                <div className={styles.serviceMeta}><span><Clock3 size={13} className="inline mr-1" />{service.minutes} min</span><span>{lang === "es" ? "Desde" : "From"} ${service.from}</span></div>
                <div className={`${styles.actions} mt-5`}><Link href={`/book?service=${service.slug}`} className={styles.primary}>{lang === "es" ? "Reservar" : "Book"}</Link><Link href={`/services/${service.slug}`} className={styles.secondary}>{lang === "es" ? "Detalles" : "Details"}</Link></div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LoungeEnvironment({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const scrollYProgress = useAdaptiveScrollProgress(ref, !reduced, "pinned");
  const smooth = useSpring(scrollYProgress, homeMotion.softSpring);
  const firstOpacity = useTransform(smooth, [0, 0.5, 0.78], [1, 1, 0]);
  const secondOpacity = useTransform(smooth, [0.42, 0.72, 1], [0, 1, 1]);
  const firstScale = useTransform(smooth, [0, 1], [1.035, 1.08]);
  const secondScale = useTransform(smooth, [0, 1], [1.08, 1.01]);
  const copyY = useTransform(smooth, [0, 1], [18, -18]);
  return (
    <section ref={ref} className={`${styles.scene} ${styles.lounge}`} aria-labelledby="lounge-title">
      <div className={styles.loungeSticky}>
        <motion.div className={styles.loungeLayer} style={reduced ? undefined : { opacity: firstOpacity, scale: firstScale }}><Image src={homeMedia.loungeGold} alt="A refined black-and-gold barber lounge" fill sizes="100vw" className="object-cover" /></motion.div>
        <motion.div className={styles.loungeLayer} style={reduced ? undefined : { opacity: secondOpacity, scale: secondScale }}><Image src={homeMedia.stationsArched} alt="Black marble barber stations with gold-framed mirrors" fill sizes="100vw" className="object-cover" /></motion.div>
        <motion.div className={styles.loungeCopy} style={reduced ? undefined : { y: copyY }}>
          <CopyBlock eyebrow={experienceCopy.lounge.eyebrow[lang]} title={<span id="lounge-title">{experienceCopy.lounge.title[lang]}</span>} body={experienceCopy.lounge.body[lang]}>
            <div className={styles.actions}><Link href="/visit" className={styles.primary}>{lang === "es" ? "Visitar el lounge" : "Visit the lounge"}<ArrowUpRight size={15} /></Link><a href={business.mapsUrl} target="_blank" rel="noreferrer" className={styles.secondary}>{lang === "es" ? "Cómo llegar" : "Get directions"}<MapPin size={15} /></a></div>
          </CopyBlock>
        </motion.div>
        <div className={styles.loungeIndex} aria-hidden="true"><span /><span /></div>
      </div>
    </section>
  );
}

function BarberProfiles({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const roster = useMemo(() => barbers.filter((barber) => barber.active), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = roster[activeIndex] ?? roster[0];
  const show = (index: number) => setActiveIndex((index + roster.length) % roster.length);
  return (
    <section className={`${styles.scene} ${styles.barberScene}`} aria-labelledby="barbers-title">
      <div className={styles.sceneInner}>
        <div className={styles.barberIntro}>
          <CopyBlock eyebrow={experienceCopy.barbers.eyebrow[lang]} title={<span id="barbers-title">{experienceCopy.barbers.title[lang]}</span>} body={experienceCopy.barbers.body[lang]} />
          <div className={styles.barberArrows}>
            <button type="button" onClick={() => show(activeIndex - 1)} aria-label={lang === "es" ? "Barbero anterior" : "Previous barber"}><ChevronLeft /></button>
            <span>{String(activeIndex + 1).padStart(2, "0")} / {String(roster.length).padStart(2, "0")}</span>
            <button type="button" onClick={() => show(activeIndex + 1)} aria-label={lang === "es" ? "Siguiente barbero" : "Next barber"}><ChevronRight /></button>
          </div>
        </div>
        <div className={styles.barberStage}>
          <div className={styles.barberPortraitShell}>
            <div className={styles.barberHalo} aria-hidden="true" />
            <AnimatePresence mode="wait">
              <motion.div
                key={active.slug}
                className={styles.barberPortrait}
                initial={reduced ? false : { opacity: 0, x: 34, scale: 0.985 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={reduced ? undefined : { opacity: 0, x: -28, scale: 0.99 }}
                transition={{ duration: 0.5, ease: homeMotion.ease }}
              >
                <Image src={active.image.profile} alt={active.image.alt[lang]} fill sizes="(max-width: 760px) 92vw, 46vw" priority={activeIndex === 0} style={{ objectPosition: active.image.objectPosition.profile }} className="object-cover" />
              </motion.div>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${active.slug}-copy`}
              className={styles.barberDetails}
              initial={reduced ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -14 }}
              transition={{ duration: 0.42, ease: homeMotion.ease }}
            >
              <p className={styles.eyebrow}>{active.title[lang]}</p>
              <h3>{active.name}</h3>
              <p>{active.bio[lang]}</p>
              <div className={styles.barberMeta}>{active.specialties[lang]} · {active.languages}</div>
              <p className={styles.barberAvailability}>{active.availability[lang]}</p>
              <div className={styles.actions}><Link href={`/book?barber=${active.slug}`} data-magnetic="true" className={styles.primary}>{lang === "es" ? "Reservar esta silla" : "Book this barber"}</Link><Link href={`/barbers/${active.slug}`} className={styles.secondary}>{lang === "es" ? "Ver perfil" : "View profile"}</Link></div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className={styles.barberRail} role="tablist" aria-label={lang === "es" ? "Seleccionar barbero" : "Select a barber"}>
          {roster.map((barber, index) => (
            <button
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? styles.barberThumbActive : styles.barberThumb}
              key={barber.slug}
              onClick={() => show(index)}
            >
              <Image src={barber.image.card} alt="" width={120} height={150} style={{ objectPosition: barber.image.objectPosition.card }} />
              <span>{barber.name}</span>
            </button>
          ))}
        </div>
        <div className={styles.allBarbersAction}><Link href="/barbers" className={styles.secondary}>{lang === "es" ? "Ver todo el equipo" : "View the full team"}<ArrowUpRight size={15} /></Link></div>
      </div>
    </section>
  );
}

function Transformation({ lang }: { lang: Lang }) {
  const [value, setValue] = useState(55);
  return (
    <section className={`${styles.scene} ${styles.transformationScene}`} aria-labelledby="transformation-title">
      <div className={`${styles.sceneInner} ${styles.transformGrid}`}>
        <CopyBlock eyebrow={experienceCopy.transformation.eyebrow[lang]} title={<span id="transformation-title">{experienceCopy.transformation.title[lang]}</span>} body={experienceCopy.transformation.body[lang]}>
          <div className={styles.actions}><Link href="/gallery" className={styles.secondary}>{lang === "es" ? "Explorar galería" : "Explore gallery"}<ArrowUpRight size={15} /></Link></div>
        </CopyBlock>
        <div>
          <div className={styles.comparison}>
            <div className={styles.comparisonBase}><Image src={homeMedia.toolsTray} alt="Precision grooming tools prepared for consultation" fill sizes="(max-width: 760px) 100vw, 58vw" className="object-cover" /></div>
            <div className={styles.comparisonReveal} style={{ width: `${value}%` }}><Image src={homeMedia.loungeGold} alt="Refined barber chair representing the completed service experience" fill sizes="(max-width: 760px) 100vw, 58vw" className="object-cover" /></div>
            <span className={`${styles.comparisonLabel} ${styles.labelLeft}`}>{lang === "es" ? "Consulta" : "Consultation"}</span>
            <span className={`${styles.comparisonLabel} ${styles.labelRight}`}>{lang === "es" ? "Acabado" : "Tailored finish"}</span>
          </div>
          <label className="sr-only" htmlFor="experience-reveal">{lang === "es" ? "Controlar la revelación del recorrido del servicio" : "Control the service journey reveal"}</label>
          <input id="experience-reveal" className={styles.slider} type="range" min="8" max="92" value={value} onChange={(event) => setValue(Number(event.target.value))} />
        </div>
      </div>
    </section>
  );
}

function ClientConfidence({ lang }: { lang: Lang }) {
  const standards = lang === "es"
    ? [
        ["01", "Información clara", "Servicios, precios iniciales, políticas y tiempos presentados sin sorpresas."],
        ["02", "Servicio personal", "Elige tu barbero, comparte tus preferencias y reserva la experiencia que realmente buscas."],
        ["03", "Seguimiento profesional", "Confirmaciones, recordatorios y soporte diseñados para mantener cada visita organizada."],
      ]
    : [
        ["01", "Clear expectations", "Services, starting prices, policies, and timing presented without unpleasant surprises."],
        ["02", "Personal service", "Choose your barber, share your preferences, and reserve the experience you actually want."],
        ["03", "Professional follow-through", "Confirmations, reminders, and support designed to keep every visit organized."],
      ];
  return (
    <section className={`${styles.scene} ${styles.confidenceScene}`} aria-labelledby="confidence-title">
      <div className={styles.confidenceBackdrop} aria-hidden="true">
        <Image src={homeMedia.toolsOrnate} alt="" fill sizes="100vw" className="object-cover" />
      </div>
      <div className={`${styles.sceneInner} ${styles.confidenceLayout}`}>
        <CopyBlock
          eyebrow={lang === "es" ? "Confianza en cada visita" : "Confidence in every visit"}
          title={<span id="confidence-title">{lang === "es" ? "El lujo también es saber qué esperar." : "Luxury includes knowing what to expect."}</span>}
          body={lang === "es" ? "No usamos reseñas inventadas ni promesas vagas. Construimos confianza con claridad, consistencia y atención real." : "No invented reviews or vague promises. We build confidence through clarity, consistency, and genuine attention."}
        />
        <div className={styles.confidenceGrid}>
          {standards.map(([number, title, body]) => (
            <article key={number} className={styles.confidenceCard}>
              <span>{number}</span><h3>{title}</h3><p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatHours(lang: Lang): string[] {
  const short = (bi: { en: string; es: string }) => bi[lang].slice(0, 3);
  const fmt = (time: string) => { const [hourValue, minute] = time.split(":").map(Number); const period = hourValue >= 12 ? "PM" : "AM"; const hour = hourValue % 12 === 0 ? 12 : hourValue % 12; return `${hour}:${String(minute).padStart(2, "0")} ${period}`; };
  const closedWord = lang === "es" ? "Cerrado" : "Closed";
  const groups: { label: string[]; value: string }[] = [];
  for (const row of hours) { const value = row.closed ? closedWord : `${fmt(row.open)}–${fmt(row.close)}`; const last = groups[groups.length - 1]; if (last && last.value === value) last.label.push(short(row.day)); else groups.push({ label: [short(row.day)], value }); }
  return groups.map((group) => `${group.label.length > 1 ? `${group.label[0]}–${group.label[group.label.length - 1]}` : group.label[0]} ${group.value}`);
}

function Visit({ lang }: { lang: Lang }) {
  return (
    <section className={`${styles.scene} ${styles.visitScene}`} aria-labelledby="visit-title">
      <div className={styles.visitBackdrop}><Image src={homeMedia.stationsRound} alt="Luxury Barber Lounge station environment" fill sizes="100vw" className="object-cover" /></div>
      <div className={styles.sceneInner}>
        <motion.div className={styles.visitPanel} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.82, ease: homeMotion.ease }}>
          <p className={styles.eyebrow}>{experienceCopy.visit.eyebrow[lang]}</p>
          <h2 id="visit-title" className={`${styles.heading} mt-6`}>{experienceCopy.visit.title[lang]}</h2>
          <dl className={styles.visitInfo}>
            <div><dt>{lang === "es" ? "Dirección" : "Address"}</dt><dd>{business.street}<br />{business.city}, {business.state} {business.postalCode}</dd></div>
            <div><dt>{lang === "es" ? "Teléfono" : "Phone"}</dt><dd><a href={business.phoneHref}>{business.phone}</a><br /><a href={`mailto:${business.email}`}>{business.email}</a></dd></div>
            <div><dt>{lang === "es" ? "Horario" : "Hours"}</dt><dd>{formatHours(lang).map((line) => <span key={line} className="block">{line}</span>)}</dd></div>
            <div><dt>{lang === "es" ? "Estacionamiento" : "Parking"}</dt><dd>{lang === "es" ? "Hay estacionamiento en el lugar cerca de la Suite 106." : "On-site parking is available near Suite 106."}</dd></div>
          </dl>
          <div className={styles.actions}><a href={business.mapsUrl} target="_blank" rel="noreferrer" className={styles.primary}><MapPin size={15} />{lang === "es" ? "Indicaciones" : "Directions"}</a><a href={business.phoneHref} className={styles.secondary}><Phone size={15} />{lang === "es" ? "Llamar" : "Call"}</a><Link href="/visit" className={styles.secondary}>{lang === "es" ? "Detalles de visita" : "Visit details"}<ExternalLink size={14} /></Link></div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalConversion({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const scrollYProgress = useAdaptiveScrollProgress(ref, !reduced, "enter-to-end");
  const smooth = useSpring(scrollYProgress, homeMotion.softSpring);
  const backgroundScale = useTransform(smooth, [0, 1], [1.08, 1]);
  const ringScale = useTransform(smooth, [0, 0.8], [0.7, 1]);
  const ringRotate = useTransform(smooth, [0, 1], [-24, 0]);
  return (
    <section ref={ref} className={`${styles.scene} ${styles.finalScene}`} aria-labelledby="final-title">
      <motion.div className={styles.finalBackdrop} style={reduced ? undefined : { scale: backgroundScale }}><Image src={homeMedia.loungeEditorial} alt="A refined barber chair inside the Luxury Barber Lounge" fill sizes="100vw" className="object-cover" /></motion.div>
      <motion.div className={styles.finalChairRing} style={reduced ? undefined : { scale: ringScale, rotate: ringRotate }} aria-hidden="true"><span /><span /></motion.div>
      <div className={styles.finalInner}>
        <p className={styles.eyebrow}>{experienceCopy.final.eyebrow[lang]}</p>
        <h2 id="final-title" className={`${styles.heading} mt-6`}>{experienceCopy.final.title[lang]}</h2>
        <p className={styles.subheading}>{experienceCopy.final.body[lang]}</p>
        <div className={styles.choiceSteps} aria-label={lang === "es" ? "Pasos para reservar" : "Booking steps"}>
          <span><b>01</b>{lang === "es" ? "Tu servicio" : "Your service"}</span>
          <span><b>02</b>{lang === "es" ? "Tu barbero" : "Your barber"}</span>
          <span><b>03</b>{lang === "es" ? "Tu horario" : "Your time"}</span>
        </div>
        <div className={styles.actions}><Link href="/book" data-magnetic="true" className={styles.primary}><CalendarDays size={15} />{lang === "es" ? "Reservar experiencia" : "Book your experience"}</Link><Link href="/barbers" className={styles.secondary}>{lang === "es" ? "Conocer barberos" : "Meet the barbers"}<ArrowRight size={15} /></Link><Link href="/services" className={styles.secondary}><Scissors size={15} />{lang === "es" ? "Explorar servicios" : "Explore services"}</Link><a href={business.phoneHref} className={styles.secondary}><Phone size={15} />{lang === "es" ? "Llamar" : "Call the lounge"}</a></div>
      </div>
    </section>
  );
}

function AnimatedSpiral({ target }: { target: RefObject<HTMLDivElement | null> }) {
  const { scrollYProgress } = useScroll({ target, offset: ["start end", "end start"] });
  const progress = useSpring(scrollYProgress, homeMotion.softSpring);
  return <SpiralGuide progress={progress} />;
}

export function PostHeroExperience() {
  const { lang } = useLang();
  const rootRef = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const reduced = tier === "reduced" || tier === "mobile";
  const showAnimatedSpiral = tier === "high" || tier === "standard";

  return (
    <div ref={rootRef} className={styles.root} data-motion-tier={tier}>
        {showAnimatedSpiral ? <AnimatedSpiral target={rootRef} /> : null}
        <BarberProfiles lang={lang} reduced={reduced} />
        <ThresholdScene lang={lang} tier={tier} />
        <SignatureServices lang={lang} />
        <LoungeEnvironment lang={lang} reduced={reduced} />
        <PrecisionScene lang={lang} reduced={reduced} />
        <Transformation lang={lang} />
        <MembershipScene lang={lang} reduced={reduced} />
        <ClientConfidence lang={lang} />
        <Visit lang={lang} />
        <FinalConversion lang={lang} reduced={reduced} />
    </div>
  );
}

export default PostHeroExperience;
