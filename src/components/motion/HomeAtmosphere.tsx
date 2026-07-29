"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { roomAssets } from "@/components/hero/assets";
import { useHeroPerformanceMode } from "@/lib/motion/useHeroPerformanceMode";

const PLATES = [roomAssets.wall, roomAssets.chair, roomAssets.tools, roomAssets.mirror, roomAssets.advance] as const;

/**
 * Adaptive fixed atmosphere. Full desktop keeps the approved cross-fading film;
 * all other devices receive the same palette and photography as a single,
 * zero-loop composition so the page never pays for five full-screen layers.
 */
export function HomeAtmosphere() {
  const tier = useHeroPerformanceMode();

  if (tier !== "full") {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <Image
          src={roomAssets.wall.src}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-30"
          quality={68}
          priority
        />
        <div className="absolute inset-0 bg-[var(--color-ink)]/82" />
        <div className="absolute inset-0 [background:radial-gradient(circle_at_18%_-8%,rgba(184,134,42,0.13),transparent_58%),radial-gradient(circle_at_86%_108%,rgba(114,47,55,0.16),transparent_62%)]" />
        <FilmGrain opacity="0.035" />
      </div>
    );
  }

  return <FullAtmosphere />;
}

function FullAtmosphere() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 74, damping: 32, mass: 0.62 });

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {PLATES.map((plate, index) => (
        <Plate
          key={plate.src}
          src={plate.src}
          index={index}
          total={PLATES.length}
          progress={progress}
          priority={index === 0}
        />
      ))}
      <div className="absolute inset-0 bg-[var(--color-ink)]/78" />
      <div className="absolute inset-0 [background:radial-gradient(circle_at_18%_-8%,rgba(184,134,42,0.16),transparent_58%),radial-gradient(circle_at_86%_108%,rgba(114,47,55,0.2),transparent_62%)]" />
      <GoldDust />
      <FilmGrain opacity="0.045" />
    </div>
  );
}

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
  const opacity = useTransform(
    progress,
    [centre - span * 0.82, centre, centre + span * 0.82],
    index === 0 ? [1, 1, 0] : [0, 1, 0],
  );
  const scale = useTransform(progress, [centre - span, centre + span], [1.09, 1.015]);
  const y = useTransform(progress, [centre - span, centre + span], ["-2%", "2%"]);

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
        quality={priority ? 72 : 64}
      />
    </motion.div>
  );
}

/** 30fps, low-DPR decorative dust that stops in background tabs. */
function GoldDust() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let frame = 0;
    let running = true;
    let lastPaint = 0;
    let resizeTimer = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.35);

    type Mote = { x: number; y: number; radius: number; vx: number; vy: number; alpha: number; twinkle: number };
    let motes: Mote[] = [];

    const seed = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(24, Math.max(12, width / 72)));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.45 + Math.random(),
        vx: (Math.random() - 0.5) * 0.06,
        vy: -0.035 - Math.random() * 0.08,
        alpha: 0.1 + Math.random() * 0.24,
        twinkle: Math.random() * Math.PI * 2,
      }));
    };

    const paint = (time: number) => {
      frame = 0;
      if (!running) return;
      if (time - lastPaint < 32) {
        frame = window.requestAnimationFrame(paint);
        return;
      }
      lastPaint = time;
      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, width, height);
      for (const mote of motes) {
        mote.x += mote.vx;
        mote.y += mote.vy;
        mote.twinkle += 0.018;
        if (mote.y < -8) {
          mote.y = height + 8;
          mote.x = Math.random() * width;
        }
        if (mote.x < -8) mote.x = width + 8;
        if (mote.x > width + 8) mote.x = -8;
        const alpha = mote.alpha * (0.66 + 0.34 * Math.sin(mote.twinkle));
        context.beginPath();
        context.fillStyle = `rgba(217,190,114,${alpha.toFixed(3)})`;
        context.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
        context.fill();
      }
      frame = window.requestAnimationFrame(paint);
    };

    const start = () => {
      if (!running || frame) return;
      frame = window.requestAnimationFrame(paint);
    };
    const onVisibility = () => {
      running = !document.hidden;
      if (running) start();
      else if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(seed, 160);
    };

    seed();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

function FilmGrain({ opacity }: { opacity: string }) {
  return (
    <div
      className="absolute inset-0 mix-blend-overlay"
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E\")",
        backgroundRepeat: "repeat",
      }}
    />
  );
}
