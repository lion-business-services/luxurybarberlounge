"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { crestLayers, CREST_ASPECT, roomAssets, availableTools, type HeroAsset } from "./assets";
import { HeroStats } from "./HeroStats";

/* Scene boundaries on the 0 → 1 scroll timeline.
   1 arrival · 2 lounge · 3 craft · 4 experience · 5 book */
const S = { arrival: 0.18, lounge: 0.42, craft: 0.7, experience: 0.88 };

const copy = {
  craftKicker: { en: "Crafted with precision", es: "Hecho con precisión" },
  craftLine: {
    en: "Every fade is measured by eye, blended by hand, and finished with a straight edge.",
    es: "Cada degradado se mide a ojo, se difumina a mano y se termina con filo recto.",
  },
  expKicker: { en: "The experience", es: "La experiencia" },
  expLine: {
    en: "Low light, warm brass, and an hour that belongs entirely to you.",
    es: "Luz baja, latón cálido y una hora que te pertenece por completo.",
  },
  bookKicker: { en: "Book your experience", es: "Reserva tu experiencia" },
  scroll: { en: "Scroll to discover", es: "Desplázate para descubrir" },
};

export function CinematicHero() {
  const { lang } = useLang();
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const shellRef = useRef<HTMLDivElement>(null);

  // Coarse breakpoint, resolved after mount to avoid hydration mismatch.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { scrollYProgress } = useScroll({
    target: shellRef,
    offset: ["start start", "end end"],
  });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });

  /* ---------------- pointer depth (desktop, in-view only) ---------------- */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 90, damping: 18, mass: 0.5 });
  const py = useSpring(my, { stiffness: 90, damping: 18, mass: 0.5 });

  useEffect(() => {
    const el = shellRef.current;
    if (!el || !fine || reduced) return;
    let inView = true;
    const onMove = (e: PointerEvent) => {
      if (!inView) return;
      const r = el.getBoundingClientRect();
      mx.set(Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))));
      my.set(Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2))));
    };
    const reset = () => {
      mx.set(0);
      my.set(0);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
        if (!inView) reset();
      },
      { threshold: 0 },
    );
    io.observe(el);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", reset);
    document.addEventListener("pointerleave", reset);
    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", reset);
      document.removeEventListener("pointerleave", reset);
    };
  }, [fine, reduced, mx, my]);

  /* ------------------------------ scene 1 ------------------------------- */
  const crestScale = useTransform(p, [0, S.arrival, S.lounge, S.experience, 1], [1.18, 1, 0.62, 0.58, 0.92]);
  const crestY = useTransform(p, [0, S.arrival, S.lounge, S.craft, 1], ["6%", "0%", "-16%", "-18%", "-4%"]);
  const crestBlur = useTransform(p, [0, S.arrival * 0.7], [10, 0]);
  const crestFilter = useMotionTemplate`blur(${crestBlur}px)`;
  const crestOpacity = useTransform(p, [0, 0.06, S.craft, S.experience, 1], [0, 1, 0.55, 0.42, 1]);

  const introOpacity = useTransform(p, [0, 0.04, S.arrival, S.lounge * 0.92], [0, 1, 1, 0]);
  const introY = useTransform(p, [S.arrival, S.lounge * 0.92], ["0%", "-8%"]);

  const sweepX = useTransform(p, [0, S.arrival], ["-140%", "160%"]);

  /* ------------------------------ scene 2 ------------------------------- */
  const chairOpacity = useTransform(p, [S.arrival, S.arrival + 0.08, S.craft, S.craft + 0.08], [0, 0.55, 0.55, 0]);
  const chairScale = useTransform(p, [S.arrival, S.craft], [1.22, 1.04]);
  const chairY = useTransform(p, [S.arrival, S.craft], ["4%", "-5%"]);

  /* ------------------------------ scene 3 ------------------------------- */
  const craftOpacity = useTransform(p, [S.lounge, S.lounge + 0.07, S.craft - 0.03, S.craft + 0.02], [0, 1, 1, 0]);
  const craftY = useTransform(p, [S.lounge, S.craft], ["14%", "-6%"]);

  /* ------------------------------ scene 4 ------------------------------- */
  const wallOpacity = useTransform(p, [S.craft, S.craft + 0.07, S.experience + 0.04, 1], [0, 0.42, 0.34, 0.16]);
  const wallScale = useTransform(p, [S.craft, 1], [1.14, 1.02]);
  const expOpacity = useTransform(p, [S.craft + 0.02, S.craft + 0.09, S.experience - 0.02, S.experience + 0.03], [0, 1, 1, 0]);
  const expY = useTransform(p, [S.craft, S.experience], ["12%", "-4%"]);
  const warmth = useTransform(p, [S.craft, S.experience], [0, 0.22]);
  const warmGlow = useMotionTemplate`radial-gradient(circle at 50% 42%, rgba(184,134,42,${warmth}), transparent 62%)`;

  /* ------------------------------ scene 5 ------------------------------- */
  const bookOpacity = useTransform(p, [S.experience, S.experience + 0.05, 1], [0, 1, 1]);
  const bookY = useTransform(p, [S.experience, 1], ["16%", "0%"]);

  const cueOpacity = useTransform(p, [0, 0.1, 0.15], [1, 1, 0]);

  /* ----------------------- reduced motion / static ---------------------- */
  if (reduced) {
    return (
      <section className="relative overflow-hidden border-b border-[var(--color-ink-line)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_-10%,rgba(184,134,42,0.12),transparent_55%),radial-gradient(circle_at_85%_110%,rgba(114,47,55,0.18),transparent_60%)]"
        />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-24 sm:px-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <HeroCopy lang={lang} />
          </div>
          <div className="md:col-span-5">
            <div className="relative mx-auto w-[70%] max-w-[320px]" style={{ aspectRatio: CREST_ASPECT }}>
              <Image
                src="/brand/lbl-logo-full.webp"
                alt="Luxury Barber Lounge"
                fill
                sizes="(max-width: 768px) 70vw, 320px"
                className="object-contain"
                priority
              />
            </div>
            <HeroStats lang={lang} className="mt-12" />
          </div>
        </div>
      </section>
    );
  }

  /* --------------------------- cinematic build -------------------------- */
  // Shorter travel on phones so the pin never feels like a trap.
  const shellHeight = compact ? "180vh" : "260vh";

  return (
    <section
      ref={shellRef}
      aria-label="Luxury Barber Lounge"
      className="relative"
      style={{ height: shellHeight }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* ---- ambient base, unchanged from the existing design ---- */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_-10%,rgba(184,134,42,0.12),transparent_55%),radial-gradient(circle_at_85%_110%,rgba(114,47,55,0.18),transparent_60%)]"
        />

        {/* ---- scene 2: the lounge chair, behind everything ---- */}
        {roomAssets.chair.present && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ opacity: chairOpacity, scale: chairScale, y: chairY }}
          >
            <Image
              src={roomAssets.chair.src}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-[var(--color-ink)]/55" />
          </motion.div>
        )}

        {/* ---- scene 4: the crest wall ---- */}
        {roomAssets.wall.present && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ opacity: wallOpacity, scale: wallScale }}
          >
            <Image
              src={roomAssets.wall.src}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-[var(--color-ink)]/60" />
          </motion.div>
        )}

        {/* warm gold wash for scene 4 */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: warmGlow }} />

        {/* ---- the crest, built from real depth planes ---- */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center"
          style={{ opacity: crestOpacity, scale: crestScale, y: crestY, filter: crestFilter }}
        >
          <div
            className="relative w-[62vw] max-w-[520px] md:w-[34vw]"
            style={{ aspectRatio: CREST_ASPECT, perspective: 1200 }}
          >
            <CrestPlane src={crestLayers.ring} depth={-26} px={px} py={py} />
            <CrestPlane src={crestLayers.crest} depth={8} px={px} py={py} priority />
            <CrestPlane src={crestLayers.flourish} depth={20} px={px} py={py} />
            <CrestPlane src={crestLayers.crown} depth={34} px={px} py={py} priority />
            <CrestPlane src={crestLayers.lounge} depth={-12} px={px} py={py} />

            {/* scene 1: metallic sweep across the crest */}
            <motion.span
              className="pointer-events-none absolute inset-0"
              style={{
                x: sweepX,
                backgroundImage:
                  "linear-gradient(104deg, transparent 40%, rgba(232,200,122,0.5) 50%, transparent 60%)",
                WebkitMaskImage: "url(/brand/lbl-logo-full.png)",
                maskImage: "url(/brand/lbl-logo-full.png)",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          </div>
        </motion.div>

        {/* ---- optional tool planes (scene 3). Absent by design today. ---- */}
        {availableTools.map((tool, i) => (
          <ToolPlane key={tool.src} tool={tool} index={i} progress={p} opacity={craftOpacity} />
        ))}

        {/* ================= copy layers ================= */}
        <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center px-6 sm:px-10">
          {/* scene 1 */}
          <motion.div style={{ opacity: introOpacity, y: introY }} className="max-w-2xl">
            <HeroCopy lang={lang} />
          </motion.div>

          {/* scene 3 */}
          <motion.div
            style={{ opacity: craftOpacity, y: craftY }}
            className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 sm:inset-x-10"
          >
            <SceneMessage kicker={copy.craftKicker[lang]} line={copy.craftLine[lang]} />
          </motion.div>

          {/* scene 4 */}
          <motion.div
            style={{ opacity: expOpacity, y: expY }}
            className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 sm:inset-x-10"
          >
            <SceneMessage kicker={copy.expKicker[lang]} line={copy.expLine[lang]} />
          </motion.div>

          {/* scene 5 */}
          <motion.div
            style={{ opacity: bookOpacity, y: bookY }}
            className="absolute inset-x-6 bottom-[14svh] sm:inset-x-10"
          >
            <p className="text-[11px] tracking-[0.36em] uppercase text-[var(--color-brass)]">
              {copy.bookKicker[lang]}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/book"
                data-magnetic="true"
                className="group inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-8 py-4 text-[12px] tracking-[0.24em] uppercase text-[var(--color-ink)] transition-colors duration-300 hover:bg-[var(--color-brass-light)]"
              >
                {dict.hero.cta[lang]}
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </Link>
              <Link
                href="/walk-ins"
                data-magnetic="true"
                className="inline-flex items-center gap-3 rounded-full border border-[var(--color-ink-line)] px-7 py-4 text-[12px] tracking-[0.24em] uppercase text-[var(--color-bone)] transition-colors duration-300 hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
              >
                {lang === "es" ? "Fila sin cita" : "Walk-in queue"}
              </Link>
            </div>
          </motion.div>
        </div>

        {/* ---- scroll cue ---- */}
        <motion.div
          aria-hidden
          style={{ opacity: cueOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-3"
        >
          <span className="text-[10px] tracking-[0.34em] uppercase text-[var(--color-bone-muted)]">
            {copy.scroll[lang]}
          </span>
          <span className="relative block h-10 w-px bg-[var(--color-ink-line)]">
            <motion.span
              className="absolute inset-x-0 top-0 block h-4 bg-[var(--color-brass)]"
              animate={{ y: [0, 24, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- helpers */

/** One depth plane of the crest, offset by pointer position in proportion to depth. */
function CrestPlane({
  src,
  depth,
  px,
  py,
  priority,
}: {
  src: string;
  depth: number;
  px: MotionValue<number>;
  py: MotionValue<number>;
  priority?: boolean;
}) {
  // Max ~14px translation and ~1.6deg rotation, per spec.
  const x = useTransform(px, [-1, 1], [-depth * 0.42, depth * 0.42]);
  const y = useTransform(py, [-1, 1], [-depth * 0.3, depth * 0.3]);
  const rotateY = useTransform(px, [-1, 1], [-1.6, 1.6]);
  const rotateX = useTransform(py, [-1, 1], [1.2, -1.2]);
  return (
    <motion.div className="absolute inset-0" style={{ x, y, rotateX, rotateY, z: depth }}>
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 768px) 62vw, 34vw"
        className="object-contain"
        priority={priority}
      />
    </motion.div>
  );
}

/** One optional tool cut-out on its own depth plane. Hooks stay at component top level. */
function ToolPlane({
  tool,
  index,
  progress,
  opacity,
}: {
  tool: HeroAsset;
  index: number;
  progress: MotionValue<number>;
  opacity: MotionValue<number>;
}) {
  const from = 40 + index * 18;
  const y = useTransform(progress, [S.lounge, S.craft], [`${from}px`, `${-from}px`]);
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 grid place-items-center"
      style={{ opacity, y }}
    >
      <Image
        src={tool.src}
        alt=""
        width={tool.width}
        height={tool.height}
        className="w-[18vw] max-w-[220px]"
        loading="lazy"
      />
    </motion.div>
  );
}

function SceneMessage({ kicker, line }: { kicker: string; line: string }) {
  return (
    <div className="max-w-xl">
      <p className="text-[11px] tracking-[0.36em] uppercase text-[var(--color-brass)]">{kicker}</p>
      <p className="font-display mt-6 text-3xl leading-snug italic text-[var(--color-bone)] md:text-4xl">
        {line}
      </p>
    </div>
  );
}

function HeroCopy({ lang }: { lang: "en" | "es" }) {
  return (
    <>
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brass)]/40 px-3 py-1 text-[10px] tracking-[0.32em] uppercase text-[var(--color-brass)]">
        <span className="h-1 w-1 rounded-full bg-[var(--color-brass)]" aria-hidden />
        {dict.hero.comingSoon[lang]}
      </span>
      <p className="mt-8 text-[11px] tracking-[0.38em] uppercase text-[var(--color-bone-muted)]">
        {dict.hero.eyebrow[lang]}
      </p>
      <h1 className="font-display mt-6 text-6xl leading-[0.95] tracking-tight text-[var(--color-bone)] md:text-8xl">
        Luxury Barber
        <br />
        Lounge
      </h1>
      <p className="font-display mt-8 max-w-xl text-xl italic leading-relaxed text-[var(--color-bone)]/85 md:text-2xl">
        {dict.hero.tagline[lang]}
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-5">
        <Link
          href="/book"
          data-magnetic="true"
          className="group inline-flex items-center gap-3 rounded-full bg-[var(--color-brass)] px-7 py-3.5 text-[12px] tracking-[0.24em] uppercase text-[var(--color-ink)] transition-colors duration-300 hover:bg-[var(--color-brass-light)]"
        >
          {dict.hero.cta[lang]}
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </Link>
        <span className="text-[11px] tracking-[0.28em] uppercase text-[var(--color-bone-muted)]">
          {dict.hero.eyebrow[lang]}
        </span>
      </div>
    </>
  );
}

export default CinematicHero;
