"use client";

/**
 * Post-hero homepage experience.
 *
 * One connected spiral-inspired motion language for everything below the
 * locked hero. Scenes share a single visual grammar: media travels on depth
 * planes and curved masks; copy stays flat, stable, and readable. Native
 * scrolling is never hijacked — the only pinned moment is the short video
 * threshold, and it releases in under one viewport of travel.
 *
 * Scoped by design: perspective, transforms, and stacking live inside each
 * scene's own container. Nothing here touches html, body, the root layout,
 * or the hero.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import clsx from "clsx";
import { useLang } from "@/lib/i18n/context";
import { business } from "@/lib/content/site";
import { homeMedia, experienceCopy, type Bi } from "@/data/home-experience";

/* ------------------------------------------------------------- utilities */

function useSceneProgress(ref: React.RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  return useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.5 });
}

/** Responsive client-supplied still. Mobile gets the smaller encode. */
function Plate({
  media,
  className,
  priority,
  sizes = "100vw",
}: {
  media: { desktop: string; mobile: string };
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <picture className={clsx("absolute inset-0", className)}>
      <source media="(max-width: 767px)" srcSet={media.mobile} />
      <img
        src={media.desktop}
        alt=""
        className="h-full w-full object-cover"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        sizes={sizes}
      />
    </picture>
  );
}

/* ------------------------------------------------------- spiral progress */

/**
 * The gold thread. A fixed, right-edge arc that fills as the visitor moves
 * through the post-hero journey — the spiral resolved into a single line.
 * Desktop only; decorative and hidden from assistive tech.
 */
export function SpiralProgress({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start 0.8", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 26 });
  const dash = useTransform(p, [0, 1], [260, 0]);
  const fillRef = useRef<SVGPathElement>(null);
  useEffect(() => {
    // The repo restricts motion's element set, so the dash offset is written
    // directly to the SVG node from the spring subscription.
    const unsub = dash.on("change", (v) => {
      fillRef.current?.setAttribute("stroke-dashoffset", String(v));
    });
    fillRef.current?.setAttribute("stroke-dashoffset", String(dash.get()));
    return unsub;
  }, [dash]);
  if (reduced) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
      <svg width="34" height="120" viewBox="0 0 34 120" fill="none">
        <path d="M17 4 C 30 24, 4 44, 17 62 C 30 80, 4 98, 17 116" stroke="var(--color-ink-line)" strokeWidth="1" />
        <path
          ref={fillRef}
          d="M17 4 C 30 24, 4 44, 17 62 C 30 80, 4 98, 17 116"
          stroke="var(--color-brass)"
          strokeWidth="1.4"
          strokeDasharray="260"
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------- cinematic scene */

/**
 * Shared scene shell: a full-bleed backdrop on a slow depth plane, revealed
 * through a curved mask as the scene enters, with a stable copy panel above.
 */
export function CinematicScene({
  media,
  kicker,
  title,
  body,
  align = "left",
  children,
  darken = 0.62,
  curve = true,
  id,
}: {
  media: { desktop: string; mobile: string };
  kicker: Bi;
  title: Bi;
  body?: Bi;
  align?: "left" | "center";
  children?: ReactNode;
  darken?: number;
  curve?: boolean;
  id?: string;
}) {
  const { lang } = useLang();
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const p = useSceneProgress(ref);

  const y = useTransform(p, [0, 1], ["-7%", "7%"]);
  const scale = useTransform(p, [0, 0.5, 1], [1.12, 1.04, 1.1]);
  const clip = useTransform(
    p,
    [0, 0.32],
    curve
      ? ["inset(12% 6% 12% 6% round 46% 46% 8% 8%)", "inset(0% 0% 0% 0% round 0px)"]
      : ["inset(0%)", "inset(0%)"],
  );
  const copyY = useTransform(p, [0.05, 0.4], [28, 0]);
  const copyOpacity = useTransform(p, [0.05, 0.35, 0.85, 1], [0, 1, 1, 0.55]);

  return (
    <section ref={ref} id={id} className="relative overflow-hidden border-t border-[var(--color-ink-line)]">
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={reduced ? undefined : { y, scale, clipPath: clip }}
      >
        <Plate media={media} />
        <div className="absolute inset-0" style={{ background: `rgba(10,10,10,${darken})` }} />
      </motion.div>
      <div
        className={clsx(
          "relative mx-auto flex min-h-[78svh] max-w-6xl flex-col justify-center px-6 py-24 sm:px-10",
          align === "center" && "items-center text-center",
        )}
      >
        <motion.div style={reduced ? undefined : { y: copyY, opacity: copyOpacity }} className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--color-brass)]">{kicker[lang]}</p>
          <h2 className="font-display fluid-scene mt-5 text-[var(--color-bone)]">{title[lang]}</h2>
          {body && <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--color-bone)]/80 sm:text-base">{body[lang]}</p>}
          {children}
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- 1 · threshold */

/**
 * The threshold. The uploaded cinematic interior opens through an arched
 * portal directly after the hero — briefly pinned, released within ~1.6
 * viewports, reversible, and never restarting on direction change.
 */
export function ThresholdScene() {
  const { lang } = useLang();
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.5 });

  const portal = useTransform(
    p,
    [0, 0.38],
    ["inset(18% 26% 18% 26% round 46% 46% 10% 10%)", "inset(0% 0% 0% 0% round 0px)"],
  );
  const glow = useTransform(p, [0, 0.34, 0.6, 0.9], [0.32, 0.08, 0.1, 0.26]);
  // beat 1 — step into distinction
  const copyOpacity = useTransform(p, [0.08, 0.26, 0.5, 0.6], [0, 1, 1, 0]);
  const copyY = useTransform(p, [0.08, 0.34], [26, 0]);
  // beat 2 — membership, carried by the same room
  const memOpacity = useTransform(p, [0.6, 0.7, 0.94, 1], [0, 1, 1, 0.6]);
  const memY = useTransform(p, [0.6, 0.78], [30, 0]);
  const memDim = useTransform(p, [0.55, 0.72], [0, 0.28]);
  // concentric brass rings: scale apart and counter-rotate as the beat lands
  const ringScaleA = useTransform(p, [0.55, 0.9], [0.72, 1.06]);
  const ringScaleB = useTransform(p, [0.55, 0.9], [0.6, 1.18]);
  const ringScaleC = useTransform(p, [0.55, 0.9], [0.5, 1.32]);
  const ringRotA = useTransform(p, [0.5, 1], [-24, 14]);
  const ringRotB = useTransform(p, [0.5, 1], [18, -22]);
  const ringRotC = useTransform(p, [0.5, 1], [-10, 30]);
  const ringOpacity = useTransform(p, [0.58, 0.7, 0.96, 1], [0, 0.85, 0.85, 0.4]);

  if (reduced) {
    return (
      <section className="relative overflow-hidden border-t border-[var(--color-ink-line)]">
        <div aria-hidden className="absolute inset-0">
          <Image src={homeMedia.video.poster} alt="" fill sizes="100vw" className="object-cover opacity-45" />
          <div className="absolute inset-0 bg-[var(--color-ink)]/68" />
        </div>
        <div className="relative mx-auto max-w-6xl space-y-20 px-6 py-28 text-center sm:px-10">
          <ThresholdCopy lang={lang} />
          <div className="mx-auto max-w-xl">
            <MembershipBeat lang={lang} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative" style={{ height: compact ? "185vh" : "225vh" }}>
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
        {/* gold aperture glow behind the portal */}
        <motion.div
          aria-hidden
          className="absolute inset-0"
          style={{
            opacity: glow,
            background:
              "radial-gradient(circle at 50% 48%, rgba(184,134,42,0.5), transparent 55%)",
          }}
        />
        <motion.div aria-hidden className="absolute inset-0" style={{ clipPath: portal }}>
          {compact ? (
            <Image src={homeMedia.video.poster} alt="" fill sizes="100vw" className="object-cover" />
          ) : (
            <ThresholdVideo />
          )}
          <div className="absolute inset-0 bg-[var(--color-ink)]/55" />
        </motion.div>

        {/* beat-2 dimmer keeps membership type readable over the film */}
        <motion.div aria-hidden className="absolute inset-0 bg-[var(--color-ink)]" style={{ opacity: memDim }} />

        {/* beat 1 · step into distinction */}
        <motion.div
          style={{ opacity: copyOpacity, y: copyY }}
          className="absolute z-10 mx-auto max-w-2xl px-6 text-center sm:px-10"
        >
          <ThresholdCopy lang={lang} />
        </motion.div>

        {/* beat 2 · membership, inside the same room */}
        <div className="absolute z-10 grid place-items-center px-6 sm:px-10">
          {/* concentric rings on their own depth planes */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute h-[46vmin] w-[46vmin] rounded-full border border-[var(--color-brass)]/50"
            style={{ opacity: ringOpacity, scale: ringScaleA, rotate: ringRotA }}
          />
          <motion.span
            aria-hidden
            className="pointer-events-none absolute h-[58vmin] w-[58vmin] rounded-full border border-dashed border-[var(--color-brass)]/30"
            style={{ opacity: ringOpacity, scale: ringScaleB, rotate: ringRotB }}
          />
          <motion.span
            aria-hidden
            className="pointer-events-none absolute h-[70vmin] w-[70vmin] rounded-full border border-[var(--color-brass)]/15"
            style={{ opacity: ringOpacity, scale: ringScaleC, rotate: ringRotC }}
          />
          <motion.div style={{ opacity: memOpacity, y: memY }} className="relative max-w-xl text-center">
            <MembershipBeat lang={lang} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function MembershipBeat({ lang }: { lang: "en" | "es" }) {
  const c = experienceCopy.membership;
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--color-brass)]">{c.kicker[lang]}</p>
      <h2 className="font-display fluid-scene mt-5 text-[var(--color-bone)]">{c.title[lang]}</h2>
      <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-[var(--color-bone)]/80 sm:text-base">{c.body[lang]}</p>
      <div className="mt-9 flex justify-center">
        <Link
          href="/membership"
          data-magnetic="true"
          className="group inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-8 py-4 text-[12px] uppercase tracking-[0.24em] text-[var(--color-ink)] transition-colors duration-300 hover:bg-[var(--color-brass-light)]"
        >
          {c.cta[lang]}
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </>
  );
}

function ThresholdCopy({ lang }: { lang: "en" | "es" }) {
  const c = experienceCopy.threshold;
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--color-brass)]">{c.kicker[lang]}</p>
      <h2 className="font-display fluid-scene mt-5 text-[var(--color-bone)]">{c.title[lang]}</h2>
      <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[var(--color-bone)]/80 sm:text-base">{c.body[lang]}</p>
    </>
  );
}

function ThresholdVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.05 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      className="h-full w-full object-cover"
      src={homeMedia.video.src}
      poster={homeMedia.video.poster}
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
    />
  );
}

/* --------------------------------------------------- 2 · art of precision */

/** Craft stages beside slowly counter-drifting tool imagery. Copy never rotates. */
export function PrecisionScene() {
  const { lang } = useLang();
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const p = useSceneProgress(ref);
  const c = experienceCopy.precision;

  const yA = useTransform(p, [0, 1], ["-6%", "6%"]);
  const yB = useTransform(p, [0, 1], ["5%", "-5%"]);
  const glint = useTransform(p, [0.2, 0.5, 0.8], ["-30%", "60%", "150%"]);

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-[var(--color-ink-line)]">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 py-24 sm:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* stable copy column */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--color-brass)]">{c.kicker[lang]}</p>
          <h2 className="font-display fluid-scene mt-5 text-[var(--color-bone)]">{c.title[lang]}</h2>
          <ol className="mt-10 space-y-7">
            {c.stages.map((stage, i) => (
              <li key={stage.t.en}>
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-5"
                >
                <span className="font-display mt-0.5 text-lg text-[var(--color-brass)]">0{i + 1}</span>
                <div>
                  <h3 className="text-sm uppercase tracking-[0.2em] text-[var(--color-bone)]">{stage.t[lang]}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-bone-muted)]">{stage.d[lang]}</p>
                </div>
                </motion.div>
              </li>
            ))}
          </ol>
        </div>

        {/* counter-drifting tool plates with a travelling glint */}
        <div aria-hidden className="relative hidden min-h-[560px] lg:block" style={{ perspective: 1000 }}>
          <motion.div
            className="absolute left-0 top-0 h-[54%] w-[78%] overflow-hidden rounded-sm border border-[var(--color-ink-line)]"
            style={reduced ? undefined : { y: yA }}
          >
            <Plate media={homeMedia.tools.duoStand} sizes="40vw" />
          </motion.div>
          <motion.div
            className="absolute bottom-0 right-0 h-[54%] w-[78%] overflow-hidden rounded-sm border border-[var(--color-brass)]/25"
            style={reduced ? undefined : { y: yB }}
          >
            <Plate media={homeMedia.tools.caddy} sizes="40vw" />
            <motion.span
              className="absolute inset-y-0 w-24 rotate-12 bg-gradient-to-r from-transparent via-[rgba(232,200,122,0.28)] to-transparent"
              style={reduced ? undefined : { left: glint }}
            />
          </motion.div>
        </div>

        {/* mobile gets one calm plate */}
        <div aria-hidden className="relative aspect-[16/10] overflow-hidden rounded-sm border border-[var(--color-ink-line)] lg:hidden">
          <Plate media={homeMedia.tools.duoStand} />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- 4 · lounge environment */

/** A walk through the room: three interiors dissolve through mirror-arched masks. */
export function LoungeJourney() {
  const { lang } = useLang();
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const p = useSceneProgress(ref);
  const c = experienceCopy.lounge;

  const plates = [
    { media: homeMedia.interiors.stationsB, label: { en: "The stations", es: "Las estaciones" } },
    { media: homeMedia.interiors.archMirror, label: { en: "The mirror", es: "El espejo" } },
    { media: homeMedia.interiors.goldAccents, label: { en: "The details", es: "Los detalles" } },
  ];
  const o0 = useTransform(p, [0, 0.34, 0.44], [1, 1, 0]);
  const o1 = useTransform(p, [0.38, 0.48, 0.62, 0.72], [0, 1, 1, 0]);
  const o2 = useTransform(p, [0.66, 0.76, 1], [0, 1, 1]);
  const opacities = [o0, o1, o2];
  const scale = useTransform(p, [0, 1], [1.05, 1.15]);
  // gold aperture: the room opens through a ring, then the ring dissolves
  const aperture = useTransform(
    p,
    [0, 0.22],
    ["inset(10% 10% 10% 10% round 50%)", "inset(0% 0% 0% 0% round 0px)"],
  );
  const tickFor = [
    useTransform(o0, [0.5, 1], [0.25, 1]),
    useTransform(o1, [0.5, 1], [0.25, 1]),
    useTransform(o2, [0.5, 1], [0.25, 1]),
  ];

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-[var(--color-ink-line)]">
      <motion.div aria-hidden className="absolute inset-0" style={reduced ? undefined : { clipPath: aperture }}>
        {plates.map((plate, i) => (
          <motion.div
            key={plate.media.desktop}
            className="absolute inset-0"
            style={reduced ? { opacity: i === 0 ? 1 : 0 } : { opacity: opacities[i], scale }}
          >
            <Plate media={plate.media} priority={i === 0} />
          </motion.div>
        ))}
        <div className="absolute inset-0 bg-[var(--color-ink)]/62" />
      </motion.div>

      <div className="relative mx-auto flex min-h-[96svh] max-w-6xl flex-col justify-end px-6 pb-20 pt-32 sm:px-10">
        <div className="max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--color-brass)]">{c.kicker[lang]}</p>
          <h2 className="font-display fluid-scene mt-5 text-[var(--color-bone)]">{c.title[lang]}</h2>
          <p className="mt-6 text-sm leading-7 text-[var(--color-bone)]/80 sm:text-base">{c.body[lang]}</p>
        </div>

        {/* room legend: which part of the lounge is on screen */}
        <div className="mt-10 flex items-center gap-6">
          {plates.map((plate, i) => (
            <motion.span
              key={plate.media.desktop}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-[var(--color-bone)]"
              style={reduced ? undefined : { opacity: tickFor[i] }}
            >
              <span aria-hidden className="block h-px w-7 bg-[var(--color-brass)]" />
              {plate.label[lang]}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------- 8 · brand signature */

/** The business cards separate into depth planes; the official mark stays authoritative. */
export function BrandSignatureScene() {
  const { lang } = useLang();
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const p = useSceneProgress(ref);
  const c = experienceCopy.signature;

  const yCard = useTransform(p, [0, 1], ["4%", "-4%"]);
  const foil = useTransform(p, [0.25, 0.75], ["-40%", "140%"]);

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-[var(--color-ink-line)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 sm:px-10 lg:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--color-brass)]">{c.kicker[lang]}</p>
          <h2 className="font-display fluid-scene mt-5 text-[var(--color-bone)]">{c.title[lang]}</h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-[var(--color-bone)]/80 sm:text-base">{c.body[lang]}</p>
          <div className="mt-9 flex items-center gap-4">
            <span aria-hidden className="relative block h-12 w-12">
              <Image src="/brand/lbl-crest.webp" alt="" fill sizes="48px" className="object-contain" />
            </span>
            <span className="text-[11px] uppercase tracking-[0.3em] text-[var(--color-bone-muted)]">
              Luxury Barber Lounge · Northfield, NJ
            </span>
          </div>
        </div>
        <motion.div
          aria-hidden
          className="relative aspect-[16/10] overflow-hidden rounded-sm border border-[var(--color-brass)]/25"
          style={reduced ? undefined : { y: yCard }}
        >
          <Plate media={homeMedia.brand.cards} sizes="(max-width:1023px) 100vw, 50vw" />
          <motion.span
            className="absolute inset-y-0 w-28 rotate-12 bg-gradient-to-r from-transparent via-[rgba(232,200,122,0.24)] to-transparent"
            style={reduced ? undefined : { left: foil }}
          />
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- 10 · visit */

/** The spiral grounds itself: completely stable business facts over a calm interior. */
export function VisitScene() {
  const { lang } = useLang();
  const c = experienceCopy.visit;
  return (
    <section className="relative overflow-hidden border-t border-[var(--color-ink-line)]">
      <div aria-hidden className="absolute inset-0">
        <Plate media={homeMedia.atmosphere.decanter} />
        <div className="absolute inset-0 bg-[var(--color-ink)]/78" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--color-brass)]">{c.kicker[lang]}</p>
        <h2 className="font-display fluid-scene mt-5 max-w-2xl text-[var(--color-bone)]">{c.title[lang]}</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--color-bone)]/80">{c.body[lang]}</p>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:max-w-3xl">
          <address className="not-italic">
            <p className="flex items-start gap-3 text-base leading-relaxed text-[var(--color-bone)]/90">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden />
              <span>
                {business.street}
                <br />
                {business.city}
              </span>
            </p>
          </address>
          <p className="flex items-center gap-3 text-base text-[var(--color-bone)]/90">
            <Phone className="h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden />
            <a href={business.phoneHref} className="transition-colors duration-300 hover:text-[var(--color-brass)]">
              {business.phone}
            </a>
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/book"
            data-magnetic="true"
            className="group inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-8 py-4 text-[12px] uppercase tracking-[0.24em] text-[var(--color-ink)] transition-colors duration-300 hover:bg-[var(--color-brass-light)]"
          >
            {c.book[lang]}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <a
            href={business.phoneHref}
            data-magnetic="true"
            className="inline-flex items-center gap-3 rounded-full border border-[var(--color-ink-line)] px-7 py-4 text-[12px] uppercase tracking-[0.24em] text-[var(--color-bone)] transition-colors duration-300 hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
          >
            {c.call[lang]}
          </a>
          <a
            href={business.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 rounded-full border border-[var(--color-ink-line)] px-7 py-4 text-[12px] uppercase tracking-[0.24em] text-[var(--color-bone)] transition-colors duration-300 hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
          >
            {c.directions[lang]}
          </a>
          <Link
            href="/walk-ins"
            className="inline-flex items-center gap-3 rounded-full border border-[var(--color-ink-line)] px-7 py-4 text-[12px] uppercase tracking-[0.24em] text-[var(--color-bone)] transition-colors duration-300 hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
          >
            {c.walkins[lang]}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- final scene */

/**
 * The close. One scene carries what CtaBand and the visit block used to do:
 * the room behind glass-slow zoom, a ring that settles as the ask lands, the
 * booking actions, and the two facts a visitor actually needs — address and
 * phone. Everything above brought them here; nothing else competes with it.
 */
export function FinalScene() {
  const { lang } = useLang();
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const p = useSceneProgress(ref);
  const c = experienceCopy.final;
  const v = experienceCopy.visit;

  const bgScale = useTransform(p, [0, 1], [1.16, 1.02]);
  const bgY = useTransform(p, [0, 1], ["-5%", "3%"]);
  const panelY = useTransform(p, [0.05, 0.45], [46, 0]);
  const panelOpacity = useTransform(p, [0.05, 0.35], [0, 1]);
  const ringScale = useTransform(p, [0.1, 0.55], [1.5, 1]);
  const ringOpacity = useTransform(p, [0.1, 0.4, 0.9], [0, 0.5, 0.28]);

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-[var(--color-ink-line)]">
      <motion.div aria-hidden className="absolute inset-0" style={reduced ? undefined : { scale: bgScale, y: bgY }}>
        <Plate media={homeMedia.interiors.stationsA} />
        <div className="absolute inset-0 bg-[var(--color-ink)]/72" />
        <div className="absolute inset-0 [background:radial-gradient(circle_at_50%_38%,rgba(184,134,42,0.16),transparent_58%)]" />
      </motion.div>

      <div className="relative mx-auto grid min-h-[92svh] max-w-6xl place-items-center px-6 py-24 sm:px-10">
        <motion.span
          aria-hidden
          className="pointer-events-none absolute h-[72vmin] w-[72vmin] rounded-full border border-[var(--color-brass)]/40"
          style={reduced ? undefined : { scale: ringScale, opacity: ringOpacity }}
        />
        <motion.div
          style={reduced ? undefined : { y: panelY, opacity: panelOpacity }}
          className="relative max-w-2xl text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--color-brass)]">{c.kicker[lang]}</p>
          <h2 className="font-display fluid-display mt-5 text-[var(--color-bone)]">{c.title[lang]}</h2>
          <p className="mx-auto mt-7 max-w-xl text-sm leading-7 text-[var(--color-bone)]/80 sm:text-base">{c.body[lang]}</p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/book"
              data-magnetic="true"
              className="group inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-9 py-4 text-[12px] uppercase tracking-[0.24em] text-[var(--color-ink)] transition-colors duration-300 hover:bg-[var(--color-brass-light)]"
            >
              {c.book[lang]}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/walk-ins"
              data-magnetic="true"
              className="inline-flex items-center gap-3 rounded-full border border-[var(--color-brass)]/40 px-8 py-4 text-[12px] uppercase tracking-[0.24em] text-[var(--color-bone)] transition-colors duration-300 hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
            >
              {c.queue[lang]}
            </Link>
          </div>

          {/* the two facts that matter, plus directions — nothing else */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-[var(--color-bone)]/10 pt-8 text-[12px] tracking-[0.16em] text-[var(--color-bone)]/80">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-[var(--color-brass)]" aria-hidden />
              {business.street}, {business.city}
            </span>
            <a
              href={business.phoneHref}
              className="inline-flex items-center gap-2 transition-colors duration-300 hover:text-[var(--color-brass)]"
            >
              <Phone className="h-3.5 w-3.5 text-[var(--color-brass)]" aria-hidden />
              {business.phone}
            </a>
            <a
              href={business.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 uppercase transition-colors duration-300 hover:text-[var(--color-brass)]"
            >
              {v.directions[lang]}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
