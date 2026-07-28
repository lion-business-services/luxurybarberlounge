"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLang } from "@/lib/i18n/context";
import { barbers, business, services, tiers, type Lang } from "@/lib/content/site";
import { homeMotion } from "@/lib/motion/homeMotionConfig";
import { experienceCopy, homeMedia, processSteps } from "./homeExperienceData";
import { useMotionTier, useVideoVisibility } from "./useHomeExperience";
import styles from "./home-experience.module.css";

const reveal = {
  hidden: { opacity: 0, y: 34 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease: homeMotion.ease } },
};

function CopyBlock({ eyebrow, title, body, children, className = "" }: {
  eyebrow: string;
  title: ReactNode;
  body?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={reveal}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={`${styles.heading} mt-6`}>{title}</h2>
      {body ? <p className={`${styles.subheading} mt-6`}>{body}</p> : null}
      {children}
    </motion.div>
  );
}

function SpiralGuide({ progress }: { progress: MotionValue<number> }) {
  return (
    <svg className={styles.spiral} viewBox="0 0 1000 7600" preserveAspectRatio="none" aria-hidden="true">
      <path d="M500 0 C900 260 940 820 520 1040 C120 1250 80 1800 510 2020 C930 2235 930 2810 500 3050 C100 3270 100 3810 510 4050 C920 4290 920 4870 500 5100 C120 5340 100 5890 510 6130 C900 6380 880 7000 500 7600" fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <motion.path d="M500 0 C900 260 940 820 520 1040 C120 1250 80 1800 510 2020 C930 2235 930 2810 500 3050 C100 3270 100 3810 510 4050 C920 4290 920 4870 500 5100 C120 5340 100 5890 510 6130 C900 6380 880 7000 500 7600" fill="none" stroke="rgba(226,193,125,.52)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={{ pathLength: progress }} />
    </svg>
  );
}

function ThresholdScene({ lang, tier }: { lang: Lang; tier: ReturnType<typeof useMotionTier> }) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = tier === "reduced";
  const useVideo = tier === "high" || tier === "standard";
  useVideoVisibility(videoRef, useVideo && !reduced);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, homeMotion.softSpring);
  const scale = useTransform(smooth, [0, 0.72, 1], [0.84, 1, 1.04]);
  const radius = useTransform(smooth, [0, 0.7], [44, 0]);
  const copyY = useTransform(smooth, [0, 1], [42, -40]);
  const copyOpacity = useTransform(smooth, [0, 0.76, 1], [1, 1, 0.2]);
  const ringRotate = useTransform(smooth, [0, 1], [0, 80]);
  const ringScale = useTransform(smooth, [0, 1], [0.82, 1.22]);

  return (
    <section ref={ref} className={`${styles.scene} ${styles.threshold}`} aria-labelledby="threshold-title">
      <div className={styles.thresholdSticky}>
        <motion.div className={styles.videoFrame} style={reduced ? undefined : { scale, borderRadius: radius }}>
          {useVideo && !reduced ? (
            <video ref={videoRef} muted playsInline loop preload="metadata" poster={homeMedia.thresholdPoster} aria-label="Cinematic view of the Luxury Barber Lounge interior">
              <source src={homeMedia.thresholdWebm} type="video/webm" />
              <source src={homeMedia.thresholdMp4} type="video/mp4" />
            </video>
          ) : (
            <Image src={homeMedia.thresholdPoster} alt="Luxury barber lounge interior" fill sizes="100vw" className="object-cover" />
          )}
        </motion.div>
        <motion.div className={styles.portalRing} style={reduced ? undefined : { rotate: ringRotate, scale: ringScale }} aria-hidden="true" />
        <motion.div className={styles.thresholdCopy} style={reduced ? undefined : { y: copyY, opacity: copyOpacity }}>
          <p className={styles.eyebrow}>{experienceCopy.threshold.eyebrow[lang]}</p>
          <h2 id="threshold-title" className={`${styles.heading} mt-6`}>{experienceCopy.threshold.title[lang]}</h2>
          <p className={`${styles.subheading} mt-6`}>{experienceCopy.threshold.body[lang]}</p>
          <div className={styles.actions}>
            <Link href="/book" data-magnetic="true" className={styles.primary}>{lang === "es" ? "Reservar una silla" : "Reserve a chair"}<ArrowUpRight size={15} /></Link>
            <Link href="/about" className={styles.secondary}>{lang === "es" ? "Nuestra historia" : "Our story"}<ArrowRight size={15} /></Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PrecisionStep({ progress, range, item }: { progress: MotionValue<number>; range: [number, number, number]; item: readonly [string, string, string] }) {
  const opacity = useTransform(progress, range, [0.25, 1, 0.58]);
  const x = useTransform(progress, range, [22, 0, -10]);
  return (
    <motion.div className={styles.step} style={{ opacity, x }}>
      <span className={styles.stepNumber}>{item[0]}</span>
      <div><h3>{item[1]}</h3><p>{item[2]}</p></div>
    </motion.div>
  );
}

function PrecisionScene({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, homeMotion.spring);
  const imageAY = useTransform(smooth, [0, 1], [70, -50]);
  const imageARotate = useTransform(smooth, [0, 1], [-5, 1]);
  const imageBY = useTransform(smooth, [0, 1], [120, -80]);
  const imageBRotate = useTransform(smooth, [0, 1], [8, -3]);
  const orbRotate = useTransform(smooth, [0, 1], [0, 150]);
  const steps = processSteps[lang];
  return (
    <section ref={ref} className={styles.scene} aria-labelledby="precision-title">
      <div className={`${styles.sceneInner} ${styles.precisionGrid}`}>
        <div className={styles.precisionVisual} aria-hidden="true">
          <motion.div className={`${styles.toolCard} ${styles.toolCardA}`} style={reduced ? undefined : { y: imageAY, rotate: imageARotate }}>
            <Image src={homeMedia.toolsTray} alt="" fill sizes="(max-width: 760px) 90vw, 52vw" className="object-cover" />
          </motion.div>
          <motion.div className={`${styles.toolCard} ${styles.toolCardB}`} style={reduced ? undefined : { y: imageBY, rotate: imageBRotate }}>
            <Image src={homeMedia.toolsStand} alt="" fill sizes="(max-width: 760px) 54vw, 24vw" className="object-cover" />
          </motion.div>
          <motion.div className={styles.toolOrb} style={reduced ? undefined : { rotate: orbRotate }} />
        </div>
        <div>
          <CopyBlock eyebrow={experienceCopy.precision.eyebrow[lang]} title={<span id="precision-title">{experienceCopy.precision.title[lang]}</span>} body={experienceCopy.precision.body[lang]} />
          <div className={styles.steps}>
            {steps.map((item, index) => {
              const center = 0.19 + index * 0.145;
              return <PrecisionStep key={item[0]} progress={smooth} range={[Math.max(0, center - .15), center, Math.min(1, center + .16)]} item={item} />;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SignatureServices({ lang }: { lang: Lang }) {
  const featured = useMemo(() => {
    const preferred = ["signature-haircut", "fade-cut", "beard-trim", "hair-beard-combo", "hot-towel-shave", "kids-cut", "groom-package"];
    return preferred.map((slug) => services.find((item) => item.slug === slug)).filter(Boolean).slice(0, 8) as typeof services;
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
              initial={{ opacity: 0, y: 48, rotateY: index % 2 ? -4 : 4 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ duration: .8, delay: Math.min(index * .06, .3), ease: homeMotion.ease }}
            >
              <span className={styles.serviceIndex}>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{service.name[lang]}</h3>
                <p>{service.blurb[lang]}</p>
                <div className={styles.serviceMeta}>
                  <span><Clock3 size={13} className="inline mr-1" />{service.minutes} min</span>
                  <span>{lang === "es" ? "Desde" : "From"} ${service.from}</span>
                </div>
                <div className={`${styles.actions} mt-5`}>
                  <Link href={`/book?service=${service.slug}`} className={styles.primary}>{lang === "es" ? "Reservar" : "Book"}</Link>
                  <Link href={`/services/${service.slug}`} className={styles.secondary}>{lang === "es" ? "Detalles" : "Details"}</Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LoungeLayer({ progress, src, range, alt, position = "center" }: { progress: MotionValue<number>; src: string; range: [number, number, number, number]; alt: string; position?: string }) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const scale = useTransform(progress, [range[0], range[3]], [1.08, 1]);
  const x = useTransform(progress, [range[0], range[3]], [22, -18]);
  return (
    <motion.div className={styles.loungeLayer} style={{ opacity, scale, x }}>
      <Image src={src} alt={alt} fill sizes="100vw" className="object-cover" style={{ objectPosition: position }} />
    </motion.div>
  );
}

function LoungeEnvironment({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, homeMotion.softSpring);
  return (
    <section ref={ref} className={`${styles.scene} ${styles.lounge}`} aria-labelledby="lounge-title">
      <div className={styles.loungeSticky}>
        {reduced ? (
          <div className={styles.loungeLayer}><Image src={homeMedia.stationsArched} alt="Refined barber stations inside a black-and-gold lounge" fill sizes="100vw" className="object-cover" /></div>
        ) : (
          <>
            <LoungeLayer progress={smooth} src={homeMedia.loungeGold} range={[0, .02, .24, .31]} alt="A refined black-and-gold barber lounge" position="left center" />
            <LoungeLayer progress={smooth} src={homeMedia.loungeEditorial} range={[.2, .29, .49, .58]} alt="A private barber chair in a cinematic lounge" position="42% center" />
            <LoungeLayer progress={smooth} src={homeMedia.stationsRound} range={[.47, .56, .74, .83]} alt="Luxury barber stations with circular illuminated mirrors" />
            <LoungeLayer progress={smooth} src={homeMedia.stationsArched} range={[.72, .81, .98, 1]} alt="Black marble barber stations with gold-framed mirrors" />
          </>
        )}
        <div className={styles.loungeCopy}>
          <CopyBlock eyebrow={experienceCopy.lounge.eyebrow[lang]} title={<span id="lounge-title">{experienceCopy.lounge.title[lang]}</span>} body={experienceCopy.lounge.body[lang]}>
            <div className={styles.actions}><Link href="/about" className={styles.secondary}>{lang === "es" ? "Conoce el estándar" : "Explore the standard"}<ArrowRight size={15} /></Link></div>
          </CopyBlock>
        </div>
        <div className={styles.loungeIndex} aria-hidden="true"><span /><span /><span /><span /></div>
      </div>
    </section>
  );
}

function BarberProfiles({ lang }: { lang: Lang }) {
  return (
    <section className={styles.scene} aria-labelledby="barbers-title">
      <div className={styles.sceneInner}>
        <CopyBlock eyebrow={experienceCopy.barbers.eyebrow[lang]} title={<span id="barbers-title">{experienceCopy.barbers.title[lang]}</span>} body={lang === "es" ? "Elige tu silla preferida o deja que el lounge conecte tu servicio con el especialista adecuado." : "Choose your preferred chair or let the lounge match your service to the right specialist."} />
        <div className={styles.barberGrid}>
          {barbers.map((barber, index) => (
            <motion.article key={barber.slug} className={styles.barberCard} initial={{ opacity: 0, y: 50, rotateY: index ? -4 : 4 }} whileInView={{ opacity: 1, y: 0, rotateY: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .9, delay: index * .12, ease: homeMotion.ease }}>
              <div className={styles.barberBackdrop}><Image src={index ? homeMedia.stationsArched : homeMedia.loungeEditorial} alt="" fill sizes="(max-width: 760px) 100vw, 50vw" className="object-cover" /></div>
              <div className={styles.barberMirror}><span className={styles.barberInitial}>{barber.initials}</span></div>
              <div className={styles.barberContent}>
                <p className={styles.eyebrow}>{barber.title[lang]}</p>
                <h3>{barber.name}</h3>
                <p>{barber.bio[lang]}</p>
                <div className={styles.barberMeta}>{barber.specialties[lang]} · {barber.languages}</div>
                <div className={styles.actions}>
                  <Link href={`/book?barber=${barber.slug}`} className={styles.primary}>{lang === "es" ? "Reservar esta silla" : "Book this barber"}</Link>
                  <Link href={`/barbers/${barber.slug}`} className={styles.secondary}>{lang === "es" ? "Ver perfil" : "View profile"}</Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Transformation({ lang }: { lang: Lang }) {
  const [value, setValue] = useState(55);
  return (
    <section className={styles.scene} aria-labelledby="transformation-title">
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

function Membership({ lang }: { lang: Lang }) {
  return (
    <section className={`${styles.scene} ${styles.membershipWrap}`} aria-labelledby="membership-title">
      <div className={styles.membershipBackdrop}><Image src={homeMedia.decanter} alt="" fill sizes="100vw" className="object-cover" /></div>
      <div className={styles.sceneInner}>
        <CopyBlock eyebrow={experienceCopy.membership.eyebrow[lang]} title={<span id="membership-title">{experienceCopy.membership.title[lang]}</span>} body={experienceCopy.membership.body[lang]} />
        <div className={styles.membershipGrid}>
          {tiers.map((tier, index) => (
            <motion.article key={tier.slug} className={`${styles.membershipCard} ${tier.featured ? styles.membershipCardFeatured : ""}`} initial={{ opacity: 0, y: 45, scale: .98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .75, delay: index * .1, ease: homeMotion.ease }}>
              <p className={styles.eyebrow}>{tier.featured ? (lang === "es" ? "Preferida" : "Preferred") : `0${index + 1}`}</p>
              <h3 className="mt-6">{tier.name[lang]}</h3>
              <p className={styles.membershipPrice}>${tier.price}<small> / {tier.cadence[lang]}</small></p>
              <p className="mt-4 text-sm leading-7 text-[rgba(243,235,221,.65)]">{tier.description[lang]}</p>
              <ul>{tier.perks.map((perk) => <li key={perk.en}><Check size={15} className="mt-1 shrink-0 text-[var(--color-brass)]" />{perk[lang]}</li>)}</ul>
              <div className={styles.actions}><Link href="/membership" className={tier.featured ? styles.primary : styles.secondary}>{lang === "es" ? "Solicitar información" : "Request information"}</Link></div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandSignature({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, homeMotion.softSpring);
  const imageRotate = useTransform(smooth, [0, 1], [-3, 2]);
  const logoY = useTransform(smooth, [0, 1], [55, -35]);
  return (
    <section ref={ref} className={`${styles.scene} ${styles.brandScene}`} aria-labelledby="brand-title">
      <div className={`${styles.sceneInner} ${styles.brandGrid}`}>
        <div className={styles.brandVisual}>
          <motion.div className={styles.brandImage} style={reduced ? undefined : { rotate: imageRotate }}><Image src={homeMedia.brandCards} alt="Black presentation cards with gold-foil barber branding" fill sizes="(max-width: 760px) 100vw, 52vw" className="object-cover" /></motion.div>
          <motion.div className={styles.brandLogo} style={reduced ? undefined : { y: logoY }}><Image src={homeMedia.officialLogo} alt="Luxury Barber Lounge" width={920} height={920} /></motion.div>
        </div>
        <CopyBlock eyebrow={experienceCopy.brand.eyebrow[lang]} title={<span id="brand-title">{experienceCopy.brand.title[lang]}</span>} body={experienceCopy.brand.body[lang]}>
          <div className={styles.actions}><Link href="/about" className={styles.secondary}>{lang === "es" ? "Descubrir la marca" : "Discover the brand"}<ArrowRight size={15} /></Link></div>
        </CopyBlock>
      </div>
    </section>
  );
}

function Confidence({ lang }: { lang: Lang }) {
  const items = lang === "es" ? [
    ["01", "Consulta clara", "Cada servicio comienza con objetivos, mantenimiento y expectativas entendidas."],
    ["02", "Estándar profesional", "El tiempo, la higiene, la preparación y el acabado reciben atención deliberada."],
    ["03", "Feedback auténtico", "Las reseñas públicas aparecen solo cuando son verificadas; no fabricamos credibilidad."],
  ] : [
    ["01", "Clear consultation", "Every service begins with goals, maintenance, and expectations understood."],
    ["02", "Professional standard", "Timing, hygiene, preparation, and finishing receive deliberate attention."],
    ["03", "Authentic feedback", "Public reviews appear only when verified; credibility is never manufactured."],
  ];
  return (
    <section className={styles.scene} aria-labelledby="confidence-title">
      <div className={styles.sceneInner}>
        <CopyBlock eyebrow={experienceCopy.confidence.eyebrow[lang]} title={<span id="confidence-title">{experienceCopy.confidence.title[lang]}</span>} body={lang === "es" ? "La confianza no necesita un contador falso. Se construye con comunicación, consistencia y atención a cada detalle." : "Confidence needs no fake counter. It is built through communication, consistency, and attention to every detail."} />
        <div className={styles.confidenceGrid}>{items.map((item, index) => <motion.article key={item[0]} className={styles.confidenceCard} initial={{ opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ duration: .7, delay: index * .1, ease: homeMotion.ease }}><span className={styles.confidenceNumber}>{item[0]}</span><h3>{item[1]}</h3><p>{item[2]}</p></motion.article>)}</div>
        <div className={`${styles.actions} mt-10`}><Link href="/reviews" className={styles.secondary}>{lang === "es" ? "Reseñas y feedback" : "Reviews & feedback"}<ArrowUpRight size={15} /></Link><Link href="/book" className={styles.primary}>{lang === "es" ? "Reservar experiencia" : "Book your experience"}</Link></div>
      </div>
    </section>
  );
}

function Visit({ lang }: { lang: Lang }) {
  return (
    <section className={`${styles.scene} ${styles.visitScene}`} aria-labelledby="visit-title">
      <div className={styles.visitBackdrop}><Image src={homeMedia.stationsRound} alt="Luxury Barber Lounge station environment" fill sizes="100vw" className="object-cover" /></div>
      <div className={styles.sceneInner}>
        <motion.div className={styles.visitPanel} initial={{ opacity: 0, x: -35 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .9, ease: homeMotion.ease }}>
          <p className={styles.eyebrow}>{experienceCopy.visit.eyebrow[lang]}</p>
          <h2 id="visit-title" className={`${styles.heading} mt-6`}>{experienceCopy.visit.title[lang]}</h2>
          <dl className={styles.visitInfo}>
            <div><dt>{lang === "es" ? "Dirección" : "Address"}</dt><dd>{business.street}<br />{business.city}, {business.state} {business.postalCode}</dd></div>
            <div><dt>{lang === "es" ? "Teléfono" : "Phone"}</dt><dd><a href={business.phoneHref}>{business.phone}</a><br /><a href={`mailto:${business.email}`}>{business.email}</a></dd></div>
            <div><dt>{lang === "es" ? "Horario" : "Hours"}</dt><dd>{lang === "es" ? "Mar–Mié 9:00 AM–7:00 PM" : "Tue–Wed 9:00 AM–7:00 PM"}<br />{lang === "es" ? "Jue–Vie 9:00 AM–8:00 PM" : "Thu–Fri 9:00 AM–8:00 PM"}<br />{lang === "es" ? "Sáb 8:00 AM–6:00 PM" : "Sat 8:00 AM–6:00 PM"}</dd></div>
            <div><dt>{lang === "es" ? "Estacionamiento" : "Parking"}</dt><dd>{lang === "es" ? "Hay estacionamiento en el lugar cerca de la Suite 106." : "On-site parking is available near Suite 106."}</dd></div>
          </dl>
          <div className={styles.actions}>
            <a href={business.mapsUrl} target="_blank" rel="noreferrer" className={styles.primary}><MapPin size={15} />{lang === "es" ? "Indicaciones" : "Directions"}</a>
            <a href={business.phoneHref} className={styles.secondary}><Phone size={15} />{lang === "es" ? "Llamar" : "Call"}</a>
            <Link href="/visit" className={styles.secondary}>{lang === "es" ? "Detalles de visita" : "Visit details"}<ExternalLink size={14} /></Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalConversion({ lang, reduced }: { lang: Lang; reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const smooth = useSpring(scrollYProgress, homeMotion.softSpring);
  const logoScale = useTransform(smooth, [0, .7, 1], [.78, 1, 1]);
  const logoRotate = useTransform(smooth, [0, 1], [-7, 0]);
  return (
    <section ref={ref} className={`${styles.scene} ${styles.finalScene}`} aria-labelledby="final-title">
      <div className={styles.finalBackdrop}><Image src={homeMedia.toolsOrnate} alt="" fill sizes="100vw" className="object-cover" /></div>
      <div className={styles.finalInner}>
        <motion.div className={styles.finalLogo} style={reduced ? undefined : { scale: logoScale, rotate: logoRotate }}><Image src={homeMedia.officialLogo} alt="Luxury Barber Lounge" width={920} height={920} /></motion.div>
        <p className={styles.eyebrow}>{experienceCopy.final.eyebrow[lang]}</p>
        <h2 id="final-title" className={`${styles.heading} mt-6`}>{experienceCopy.final.title[lang]}</h2>
        <p className={styles.subheading}>{lang === "es" ? "Grooming de precisión, atención personal y un ambiente diseñado para hacer que cada visita se sienta distinta." : "Precision grooming, personal attention, and a room designed to make every visit feel distinct."}</p>
        <div className={styles.actions}>
          <Link href="/book" data-magnetic="true" className={styles.primary}><CalendarDays size={15} />{lang === "es" ? "Reservar experiencia" : "Book your experience"}</Link>
          <a href={business.phoneHref} className={styles.secondary}><Phone size={15} />{lang === "es" ? "Llamar" : "Call the lounge"}</a>
          <Link href="/services" className={styles.secondary}><Scissors size={15} />{lang === "es" ? "Explorar servicios" : "Explore services"}</Link>
          <Link href="/walk-ins" className={styles.secondary}><Sparkles size={15} />{lang === "es" ? "Información sin cita" : "Walk-in information"}</Link>
        </div>
      </div>
    </section>
  );
}

export function PostHeroExperience() {
  const { lang } = useLang();
  const rootRef = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const systemReduced = useReducedMotion();
  const reduced = tier === "reduced" || Boolean(systemReduced);
  const { scrollYProgress } = useScroll({ target: rootRef, offset: ["start end", "end start"] });
  const progress = useSpring(scrollYProgress, homeMotion.softSpring);

  return (
    <div ref={rootRef} className={styles.root} data-motion-tier={tier}>
      <SpiralGuide progress={progress} />
      <ThresholdScene lang={lang} tier={tier} />
      <PrecisionScene lang={lang} reduced={reduced} />
      <SignatureServices lang={lang} />
      <LoungeEnvironment lang={lang} reduced={reduced} />
      <BarberProfiles lang={lang} />
      <Transformation lang={lang} />
      <Membership lang={lang} />
      <BrandSignature lang={lang} reduced={reduced} />
      <Confidence lang={lang} />
      <Visit lang={lang} />
      <FinalConversion lang={lang} reduced={reduced} />
    </div>
  );
}

export default PostHeroExperience;
