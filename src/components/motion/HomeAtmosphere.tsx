"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { roomAssets } from "@/components/hero/assets";
import { useHeroPerformanceMode } from "@/lib/motion/useHeroPerformanceMode";

/**
 * One continuous atmosphere behind the entire homepage.
 *
 * Rather than pinning the whole page (which traps the reader and wrecks
 * conversion), a single fixed backdrop travels through the shop as the visitor
 * scrolls normally. Content scrolls over it at native speed, so the page reads
 * as one unbroken scene from the first viewport to the footer.
 *
 * Every graphic here is either the client's own photography or generated
 * procedurally in-browser — nothing is fetched or licensed from third parties.
 */

const PLATES = [
  roomAssets.wall,
  roomAssets.chair,
  roomAssets.tools,
  roomAssets.mirror,
  roomAssets.advance,
] as const;

export function HomeAtmosphere() {
  const tier = useHeroPerformanceMode();
  const { scrollYProgress } = useScroll();
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 30, mass: 0.6 });

  if (tier === "minimal") {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <Image src={roomAssets.wall.src} alt="" fill sizes="100vw" className="object-cover opacity-25" priority />
        <div className="absolute inset-0 bg-[var(--color-ink)]/80" />
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {PLATES.map((plate, i) => (
        <Plate key={plate.src} src={plate.src} index={i} total={PLATES.length} progress={p} priority={i === 0} />
      ))}

      {/* brand wash — keeps every plate inside the ink/brass/oxblood palette */}
      <div className="absolute inset-0 bg-[var(--color-ink)]/78" />
      <div className="absolute inset-0 [background:radial-gradient(circle_at_18%_-8%,rgba(184,134,42,0.16),transparent_58%),radial-gradient(circle_at_86%_108%,rgba(114,47,55,0.2),transparent_62%)]" />

      {tier === "full" && <GoldDust />}
      <FilmGrain />
    </div>
  );
}

/** One backdrop plate, fading up as its slice of the page arrives. */
function Plate({
  src,
  index,
  total,
  progress,
  priority,
}: {
  src: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  priority?: boolean;
}) {
  const span = 1 / (total - 1);
  const centre = index * span;
  // Overlap neighbours so plates dissolve into each other rather than cutting.
  const opacity = useTransform(
    progress,
    [centre - span * 0.85, centre, centre + span * 0.85],
    index === 0 ? [1, 1, 0] : [0, 1, 0],
  );
  const scale = useTransform(progress, [centre - span, centre + span], [1.12, 1.02]);
  const y = useTransform(progress, [centre - span, centre + span], ["-3%", "3%"]);

  return (
    <motion.div className="absolute inset-0" style={{ opacity, scale, y }}>
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        priority={priority}
        loading={priority ? undefined : "lazy"}
      />
    </motion.div>
  );
}

/**
 * Procedural gold dust. Original work — a few dozen slow motes on a canvas,
 * drawn only while the tab is visible. No sprites, no library, no licence.
 */
function GoldDust() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Mote = { x: number; y: number; r: number; vx: number; vy: number; a: number; tw: number };
    let motes: Mote[] = [];

    const seed = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      const count = Math.round(Math.min(46, window.innerWidth / 34));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.5 + Math.random() * 1.4,
        vx: (Math.random() - 0.5) * 0.09,
        vy: -0.05 - Math.random() * 0.12,
        a: 0.12 + Math.random() * 0.32,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const frame = () => {
      raf = 0;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        m.tw += 0.012;
        if (m.y < -10) {
          m.y = h + 10;
          m.x = Math.random() * w;
        }
        if (m.x < -10) m.x = w + 10;
        if (m.x > w + 10) m.x = -10;
        const alpha = m.a * (0.6 + 0.4 * Math.sin(m.tw));
        ctx.beginPath();
        ctx.fillStyle = `rgba(217,190,114,${alpha.toFixed(3)})`;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (running) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (!running || raf) return;
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => {
      running = !document.hidden;
      if (running) start();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const onResize = () => {
      seed();
    };

    seed();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

/** Static film grain from an inline SVG turbulence filter — a few hundred bytes, no request. */
function FilmGrain() {
  return (
    <div
      className="absolute inset-0 opacity-[0.055] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.9'/%3E%3C/svg%3E\")",
        backgroundRepeat: "repeat",
      }}
    />
  );
}
