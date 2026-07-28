"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import clsx from "clsx";
import { useFinePointer, useReducedMotion } from "@/lib/motion/hooks";

/**
 * The official crest, rebuilt in three dimensions.
 *
 * The logo is split into six aligned planes (see public/brand/layers). Each sits
 * at its own depth, so pointer movement, scroll, and a slow idle drift separate
 * them into real parallax — the crown rides forward of the shield, the barber
 * pole floats inside it, the arc lettering hangs behind.
 *
 * Everything is CSS transform driven from two custom properties written once per
 * frame, so no React render happens while the pointer moves.
 *
 * Degradations, in order of severity:
 *   reduced motion  -> a single flat <Image> of the full lockup, no JS at all
 *   touch / coarse  -> layered depth + scroll and idle drift, no pointer tracking
 *   fine pointer    -> the full effect
 */

type Plane = { src: string; z: number; alt?: string; priority?: boolean };

// Ordered back-to-front. `z` is the resting depth in px.
const PLANES: Plane[] = [
  { src: "/brand/layers/arc.png", z: -40 },
  { src: "/brand/layers/lounge.png", z: -18 },
  { src: "/brand/layers/shield.png", z: 0, priority: true },
  { src: "/brand/layers/flourish.png", z: 26 },
  { src: "/brand/layers/pole.png", z: 48, priority: true },
  { src: "/brand/layers/crown.png", z: 82 },
];

const ASPECT = 1000 / 1190; // shared layer canvas

export function Crest3D({
  className,
  sizes = "(max-width: 768px) 74vw, 30vw",
}: {
  className?: string;
  sizes?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    let raf = 0;
    let visible = true;
    // pointer target and eased current values
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let scroll = 0;
    const start = performance.now();

    const loop = () => {
      raf = 0;
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;

      // Idle drift keeps the crest alive when the pointer is still.
      const t = (performance.now() - start) / 1000;
      const idleX = Math.sin(t * 0.42) * 0.22;
      const idleY = Math.cos(t * 0.33) * 0.16;

      el.style.setProperty("--px", (cx + idleX).toFixed(4));
      el.style.setProperty("--py", (cy + idleY).toFixed(4));
      el.style.setProperty("--scroll", scroll.toFixed(4));

      if (visible) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      if (!fine) return;
      const r = el.getBoundingClientRect();
      // Track across a generous field so the crest reacts before you reach it.
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.4)));
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.4)));
      kick();
    };
    const onLeaveWindow = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      scroll = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
      kick();
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible = entry.isIntersecting;
          if (visible) kick();
          else if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
        }
      },
      { threshold: 0 },
    );
    io.observe(el);

    onScroll();
    kick();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeaveWindow);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeaveWindow);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced, fine]);

  // Reduced motion: one flat image, zero scripting.
  if (reduced) {
    return (
      <div className={clsx("relative w-full", className)} style={{ aspectRatio: ASPECT }}>
        <Image
          src="/brand/lbl-logo-full.png"
          alt="Luxury Barber Lounge"
          fill
          sizes={sizes}
          className="object-contain"
          priority
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={clsx("lbl-crest3d", className)}
      style={{ aspectRatio: ASPECT }}
    >
      <div className="lbl-crest3d-stage">
        {PLANES.map((plane, i) => (
          <div
            key={plane.src}
            className="lbl-crest3d-plane"
            style={{ ["--pz" as string]: `${plane.z}px` }}
          >
            <Image
              src={plane.src}
              alt={i === 0 ? "Luxury Barber Lounge" : ""}
              aria-hidden={i !== 0}
              fill
              sizes={sizes}
              className="object-contain"
              priority={plane.priority}
            />
          </div>
        ))}
        {/* Brass specular sweep, clipped to the logo silhouette. */}
        <span aria-hidden className="lbl-crest3d-sheen" />
      </div>
    </div>
  );
}

export default Crest3D;
