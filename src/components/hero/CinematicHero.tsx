"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { dict } from "@/lib/i18n/dict";
import { useFinePointer } from "@/lib/motion/hooks";
import { useAdaptiveMotionTier } from "@/lib/motion/useAdaptiveMotionTier";
import { roomAssets, revealVideo } from "./assets";

/* Scene boundaries on the 0 → 1 timeline.
   Scene 1 is fully composed at progress 0 — nothing fades in from nothing. */
const S = {
  arrival: 0.2,
  lounge: 0.44,
  craft: 0.68,
  experience: 0.88,
};

const copy = {
  craftKicker: {
    en: "Crafted with precision",
    es: "Hecho con precisión",
  },
  craftLine: {
    en: "Every fade is measured by eye, blended by hand, finished with a straight edge.",
    es: "Cada degradado se mide a ojo, se difumina a mano y se termina con filo recto.",
  },
  mirrorKicker: {
    en: "The mirror",
    es: "El espejo",
  },
  mirrorLine: {
    en: "You will not remember the hour. You will remember the man in the mirror.",
    es: "No recordarás la hora. Recordarás al hombre en el espejo.",
  },
  expKicker: {
    en: "The experience",
    es: "La experiencia",
  },
  expLine: {
    en: "Low light, warm brass, and an hour that belongs entirely to you.",
    es: "Luz baja, latón cálido y una hora que te pertenece por completo.",
  },
  walkIn: {
    en: "Walk-in queue",
    es: "Fila sin cita",
  },
  scroll: {
    en: "Scroll to discover",
    es: "Desplázate para descubrir",
  },
};

export function CinematicHero() {
  const { lang } = useLang();
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const tier = useAdaptiveMotionTier();
  const shellRef = useRef<HTMLDivElement>(null);

  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");

    const apply = () => {
      setCompact(mq.matches);
    };

    apply();

    mq.addEventListener("change", apply);

    return () => {
      mq.removeEventListener("change", apply);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: shellRef,
    offset: ["start start", "end end"],
  });

  const p = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.4,
  });

  /* ------------------------- pointer depth ------------------------- */

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const px = useSpring(mx, {
    stiffness: 90,
    damping: 18,
    mass: 0.5,
  });

  const py = useSpring(my, {
    stiffness: 90,
    damping: 18,
    mass: 0.5,
  });

  useEffect(() => {
    const el = shellRef.current;

    if (!el || !fine || reduced) {
      return;
    }

    let inView = true;

    const onMove = (e: PointerEvent) => {
      if (!inView) {
        return;
      }

      const r = el.getBoundingClientRect();

      mx.set(
        Math.max(
          -1,
          Math.min(
            1,
            (e.clientX - (r.left + r.width / 2)) /
              (r.width / 2),
          ),
        ),
      );

      my.set(
        Math.max(
          -1,
          Math.min(
            1,
            (e.clientY - (r.top + r.height / 2)) /
              (r.height / 2),
          ),
        ),
      );
    };

    const reset = () => {
      mx.set(0);
      my.set(0);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;

        if (!inView) {
          reset();
        }
      },
      { threshold: 0 },
    );

    io.observe(el);

    window.addEventListener("pointermove", onMove, {
      passive: true,
    });

    window.addEventListener("blur", reset);
    document.addEventListener("pointerleave", reset);

    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", reset);
      document.removeEventListener("pointerleave", reset);
    };
  }, [fine, reduced, mx, my]);

  /* --------------------------- scene tracks ---------------------------
     Every scene-1 value STARTS at its visible state. The first viewport is a
     finished composition; scrolling changes it rather than creating it. */

  const openOpacity = useTransform(
    p,
    [0, S.arrival, S.lounge],
    [0.62, 0.5, 0],
  );

  const openScale = useTransform(
    p,
    [0, S.lounge],
    [1.06, 1.18],
  );

  const openY = useTransform(
    p,
    [0, S.lounge],
    ["0%", "-6%"],
  );

  const introOpacity = useTransform(
    p,
    [0, S.arrival, S.lounge * 0.94],
    [1, 1, 0],
  );

  const introY = useTransform(
    p,
    [0, S.lounge * 0.94],
    ["0%", "-9%"],
  );

  const chairOpacity = useTransform(
    p,
    [
      S.arrival,
      S.lounge,
      S.craft,
      S.craft + 0.06,
    ],
    [0, 0.62, 0.55, 0],
  );

  const chairScale = useTransform(
    p,
    [S.arrival, S.craft],
    [1.2, 1.02],
  );

  const toolsOpacity = useTransform(
    p,
    [
      S.lounge,
      S.lounge + 0.06,
      S.craft,
      S.craft + 0.05,
    ],
    [0, 0.6, 0.55, 0],
  );

  const toolsScale = useTransform(
    p,
    [S.lounge, S.craft],
    [1.16, 1.02],
  );

  const craftOpacity = useTransform(
    p,
    [
      S.lounge + 0.02,
      S.lounge + 0.08,
      S.craft - 0.02,
      S.craft + 0.03,
    ],
    [0, 1, 1, 0],
  );

  const craftY = useTransform(
    p,
    [S.lounge, S.craft],
    ["10%", "-5%"],
  );

  const mirrorOpacity = useTransform(
    p,
    [
      S.craft,
      S.craft + 0.05,
      S.experience,
      S.experience + 0.05,
    ],
    [0, 0.5, 0.45, 0.2],
  );

  const mirrorScale = useTransform(
    p,
    [S.craft, 1],
    [1.14, 1.02],
  );

  const mirrorTextOpacity = useTransform(
    p,
    [
      S.craft + 0.01,
      S.craft + 0.07,
      S.experience - 0.02,
      S.experience + 0.02,
    ],
    [0, 1, 1, 0],
  );

  const mirrorTextY = useTransform(
    p,
    [S.craft, S.experience],
    ["10%", "-4%"],
  );

  const advanceOpacity = useTransform(
    p,
    [
      S.experience,
      S.experience + 0.05,
      1,
    ],
    [0, 0.34, 0.3],
  );

  const warmth = useTransform(
    p,
    [S.craft, 1],
    [0, 0.2],
  );

  const warmGlow =
    useMotionTemplate`radial-gradient(circle at 50% 45%, rgba(184,134,42,${warmth}), transparent 64%)`;

  const bookOpacity = useTransform(
    p,
    [
      S.experience,
      S.experience + 0.04,
      1,
    ],
    [0, 1, 1],
  );

  const bookY = useTransform(
    p,
    [S.experience, 1],
    ["14%", "0%"],
  );

  const cueOpacity = useTransform(
    p,
    [0, 0.08, 0.14],
    [1, 1, 0],
  );

  const showAmbientVideo =
    tier !== "minimal";

  /* ------------------------- reduced motion ------------------------- */

  if (reduced) {
    return (
      <section className="relative overflow-hidden border-b border-[var(--color-ink-line)]">
        <div
          aria-hidden
          className="absolute inset-0"
        >
          <Image
            src={roomAssets.wall.src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-40"
            priority
          />

          <div className="absolute inset-0 bg-[var(--color-ink)]/70" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-28 sm:px-10">
          <HeroCopy lang={lang} />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={shellRef}
      aria-label="Luxury Barber Lounge"
      className="relative"
      style={{
        height: compact
          ? "155svh"
          : "280vh",
      }}
    >
      <div className="sticky top-[72px] h-[calc(100svh-72px)] overflow-hidden md:top-0 md:h-[100svh]">
        {/* ---------- SCENE 1 · composed at rest ---------- */}

        {!showAmbientVideo && (
          <ParallaxMedia
            px={px}
            py={py}
            depth={14}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: openOpacity,
                scale: openScale,
                y: openY,
              }}
            >
              <Image
                src={roomAssets.wall.src}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />

              <div className="absolute inset-0 bg-[var(--color-ink)]/62" />
            </motion.div>
          </ParallaxMedia>
        )}

        {showAmbientVideo && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: openOpacity,
            }}
          >
            <AmbientVideo mobile={compact} />

            <div className="absolute inset-0 bg-[var(--color-ink)]/58" />
          </motion.div>
        )}

        {/* ---------- SCENE 2 · the chair ---------- */}

        <ParallaxMedia
          px={px}
          py={py}
          depth={22}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: chairOpacity,
              scale: chairScale,
            }}
          >
            <Image
              src={roomAssets.chair.src}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-[var(--color-ink)]/58" />
          </motion.div>
        </ParallaxMedia>

        {/* ---------- SCENE 3 · the tools ---------- */}

        <ParallaxMedia
          px={px}
          py={py}
          depth={30}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: toolsOpacity,
              scale: toolsScale,
            }}
          >
            <Image
              src={roomAssets.tools.src}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-[var(--color-ink)]/58" />
          </motion.div>
        </ParallaxMedia>

        {/* ---------- SCENE 4 · the mirror ---------- */}

        <ParallaxMedia
          px={px}
          py={py}
          depth={24}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: mirrorOpacity,
              scale: mirrorScale,
            }}
          >
            <Image
              src={roomAssets.mirror.src}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-[var(--color-ink)]/60" />
          </motion.div>
        </ParallaxMedia>

        {/* ---------- SCENE 5 · the room ahead ---------- */}

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: advanceOpacity,
          }}
        >
          <Image
            src={roomAssets.advance.src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            loading="lazy"
          />

          <div className="absolute inset-0 bg-[var(--color-ink)]/64" />
        </motion.div>

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: warmGlow,
          }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_-10%,rgba(184,134,42,0.14),transparent_55%),radial-gradient(circle_at_85%_110%,rgba(114,47,55,0.2),transparent_60%)]"
        />

        {/* ================= copy ================= */}

        <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center px-5 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-10 sm:pb-0 sm:pt-0">
          <motion.div
            style={{
              opacity: introOpacity,
              y: introY,
            }}
            className="hero-copy max-w-2xl"
          >
            <HeroCopy lang={lang} />
          </motion.div>

          <motion.div
            style={{
              opacity: craftOpacity,
              y: craftY,
            }}
            className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 sm:inset-x-10"
          >
            <SceneMessage
              kicker={
                copy.craftKicker[lang]
              }
              line={
                copy.craftLine[lang]
              }
            />
          </motion.div>

          <motion.div
            style={{
              opacity: mirrorTextOpacity,
              y: mirrorTextY,
            }}
            className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 sm:inset-x-10"
          >
            <SceneMessage
              kicker={
                copy.mirrorKicker[lang]
              }
              line={
                copy.mirrorLine[lang]
              }
            />
          </motion.div>

          <motion.div
            style={{
              opacity: bookOpacity,
              y: bookY,
            }}
            className="safe-b absolute inset-x-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:inset-x-10 sm:bottom-[16svh]"
          >
            <p className="text-[11px] tracking-[0.36em] uppercase text-[var(--color-brass)]">
              {copy.expKicker[lang]}
            </p>

            <p className="font-display mt-4 max-w-lg text-2xl italic leading-snug text-[var(--color-bone)] md:text-3xl">
              {copy.expLine[lang]}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/book"
                data-magnetic="true"
                className="group inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-8 py-4 text-[12px] tracking-[0.24em] uppercase text-[var(--color-ink)] transition-colors duration-300 hover:bg-[var(--color-brass-light)]"
              >
                {dict.hero.cta[lang]}

                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </Link>

              <Link
                href="/walk-ins"
                data-magnetic="true"
                className="inline-flex items-center gap-3 rounded-full border border-[var(--color-ink-line)] px-7 py-4 text-[12px] tracking-[0.24em] uppercase text-[var(--color-bone)] transition-colors duration-300 hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
              >
                {copy.walkIn[lang]}
              </Link>
            </div>
          </motion.div>
        </div>

        <motion.div
          aria-hidden
          style={{
            opacity: cueOpacity,
          }}
          className="pointer-events-none absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] hidden flex-col items-center gap-3 sm:flex sm:bottom-8"
        >
          <span className="text-[10px] tracking-[0.34em] uppercase text-[var(--color-bone-muted)]">
            {copy.scroll[lang]}
          </span>

          <span className="relative block h-10 w-px bg-[var(--color-ink-line)]">
            <motion.span
              className="absolute inset-x-0 top-0 block h-4 bg-[var(--color-brass)]"
              animate={{
                y: [0, 24, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- helpers */

/** Drifts a media layer against the pointer; deeper layers move further. */
function ParallaxMedia({
  children,
  px,
  py,
  depth,
}: {
  children: ReactNode;
  px: MotionValue<number>;
  py: MotionValue<number>;
  depth: number;
}) {
  const x = useTransform(
    px,
    [-1, 1],
    [depth, -depth],
  );

  const y = useTransform(
    py,
    [-1, 1],
    [
      depth * 0.6,
      -depth * 0.6,
    ],
  );

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        x,
        y,
      }}
    >
      {children}
    </motion.div>
  );
}

/** Muted, poster-backed ambient loop. Pauses offscreen; autoplay failure falls back to the poster. */
function AmbientVideo({
  mobile,
}: {
  mobile: boolean;
}) {
  const ref =
    useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;

    if (!v) {
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.05 },
    );

    io.observe(v);

    return () => {
      io.disconnect();
    };
  }, []);

  return (
    <video
      ref={ref}
      className="h-full w-full object-cover object-center"
      poster={
        mobile
          ? "/hero/crest-reveal-mobile-poster.webp"
          : revealVideo.poster
      }
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      aria-hidden="true"
    >
      {mobile ? (
        <source
          src="/hero/crest-reveal-mobile.mp4"
          type="video/mp4"
        />
      ) : null}

      <source
        src={revealVideo.src}
        type="video/mp4"
      />
    </video>
  );
}

function SceneMessage({
  kicker,
  line,
}: {
  kicker: string;
  line: string;
}) {
  return (
    <div className="max-w-xl">
      <p className="text-[11px] tracking-[0.36em] uppercase text-[var(--color-brass)]">
        {kicker}
      </p>

      <p className="font-display fluid-scene mt-6 italic text-[var(--color-bone)]">
        {line}
      </p>
    </div>
  );
}

function HeroCopy({
  lang,
}: {
  lang: "en" | "es";
}) {
  return (
    <>
      <span className="hero-event-badge inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-[var(--color-brass)]/40 px-3 py-2 text-[9px] tracking-[0.24em] uppercase text-[var(--color-brass)] sm:rounded-full sm:py-1 sm:text-[10px] sm:tracking-[0.32em]">
        <span
          className="h-1 w-1 shrink-0 rounded-full bg-[var(--color-brass)]"
          aria-hidden
        />

        <span className="whitespace-nowrap">
          {lang === "es"
            ? "Ya Abrimos"
            : "Now Open"}
        </span>

        <span
          aria-hidden
          className="text-[var(--color-brass)]/60"
        >
          ·
        </span>

        <span className="whitespace-nowrap">
          {lang === "es"
            ? "Northfield · Reservas y Atención sin Cita"
            : "Northfield · Reservations & Walk-Ins"}
        </span>
      </span>

      <p className="mt-5 text-[10px] leading-5 tracking-[0.28em] uppercase text-[var(--color-bone-muted)] sm:mt-8 sm:text-[11px] sm:tracking-[0.38em]">
        {dict.hero.eyebrow[lang]}
      </p>

      <h1 className="font-display fluid-display mt-4 text-[var(--color-bone)] sm:mt-6">
        Luxury Barber
        <br />
        Lounge
      </h1>

      <p className="font-display fluid-lede mt-5 max-w-xl italic text-[var(--color-bone)]/85 sm:mt-8">
        {dict.hero.tagline[lang]}
      </p>

      <div className="hero-actions mt-7 grid w-full max-w-xl gap-3 sm:mt-10 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
        <Link
          href="/book"
          data-magnetic="true"
          className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-[var(--color-brass)] px-7 py-3.5 text-[12px] tracking-[0.24em] uppercase text-[var(--color-ink)] transition-colors duration-300 hover:bg-[var(--color-brass-light)] sm:w-auto"
        >
          {dict.hero.cta[lang]}

          <ArrowUpRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </Link>

        <Link
          href="/walk-ins"
          data-magnetic="true"
          className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-[var(--color-ink-line)] px-6 py-3.5 text-[12px] tracking-[0.24em] uppercase text-[var(--color-bone)] transition-colors duration-300 hover:border-[var(--color-brass)] hover:text-[var(--color-brass)] sm:w-auto"
        >
          {copy.walkIn[lang]}
        </Link>
      </div>
    </>
  );
}

export default CinematicHero;
