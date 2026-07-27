"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import clsx from "clsx";
import {
  useInView,
  useReducedMotion,
  useScrollProgress,
  useFinePointer,
} from "@/lib/motion/hooks";

export { MagneticCursor } from "./MagneticCursor";

/* ------------------------------------------------------------------ Reveal */

/**
 * Fades and lifts content into place the first time it enters the viewport.
 * `delay` staggers siblings. Reduced motion renders it plainly, instantly.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  variant = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
  variant?: "up" | "fade" | "left" | "right" | "blur";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useInView(ref);
  return (
    <Tag
      ref={ref}
      data-reveal={reduced ? "off" : variant}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}

/* ----------------------------------------------------------------- Scene3D */

/**
 * Establishes a 3D viewing volume and publishes scroll progress to children
 * as `--sp` (0→1) and `--sc` (-1→1). Children transform in CSS, so scrolling
 * costs one style write per frame rather than a React render.
 */
export function Scene3D({
  children,
  className,
  depth = 1200,
}: {
  children: ReactNode;
  className?: string;
  depth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useScrollProgress(ref, !reduced);
  return (
    <div
      ref={ref}
      data-scene={reduced ? "flat" : "3d"}
      style={{ "--depth": `${depth}px` } as CSSProperties}
      className={clsx("lbl-scene", className)}
    >
      {children}
    </div>
  );
}

/**
 * A plane inside a Scene3D. `z` pushes it toward or away from the viewer and
 * `tilt` rotates it as the scene travels through the viewport — the
 * "scroll to discover" effect. Must be used inside <Scene3D>.
 */
export function Layer({
  children,
  className,
  z = 0,
  tilt = 0,
  drift = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  z?: number;
  tilt?: number;
  drift?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className={clsx("lbl-layer", className)}
      style={
        {
          "--z": `${z}px`,
          "--tilt": `${tilt}deg`,
          "--drift": `${drift}px`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- TiltCard */

/**
 * Pointer-reactive 3D tilt with a travelling brass sheen. Desktop only:
 * touch devices get the static card, which is the correct experience there.
 */
export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const enabled = fine && !reduced;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let raf = 0;
    let nx = 0;
    let ny = 0;

    const write = () => {
      raf = 0;
      el.style.setProperty("--rx", `${(-ny * max).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(nx * max).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${((nx + 1) / 2) * 100}%`);
      el.style.setProperty("--my", `${((ny + 1) / 2) * 100}%`);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      nx = (e.clientX - r.left) / r.width - 0.5;
      ny = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(write);
    };
    const onLeave = () => {
      nx = 0;
      ny = 0;
      if (!raf) raf = requestAnimationFrame(write);
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, max]);

  return (
    <div ref={ref} data-tilt={enabled ? "on" : "off"} className={clsx("lbl-tilt", className)}>
      {children}
    </div>
  );
}

/* --------------------------------------------------------- ScrollProgress */

/** Hairline brass rule across the top of the page showing read progress. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      el.style.transform = `scaleX(${max > 0 ? doc.scrollTop / max : 0})`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return <div aria-hidden className="lbl-progress"><div ref={ref} /></div>;
}

/* ----------------------------------------------------------------- CountUp */

/** Counts to `value` when scrolled into view. Renders the final value for reduced motion and SSR. */
export function CountUp({
  value,
  pad = 2,
  duration = 1100,
  className,
}: {
  value: number;
  pad?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [n, setN] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) {
      setN(value);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || done.current) continue;
          done.current = true;
          io.unobserve(el);
          const t0 = performance.now();
          const step = (now: number) => {
            const p = Math.min(1, (now - t0) / duration);
            // easeOutExpo — fast start, gentle landing
            const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            setN(Math.round(eased * value));
            if (p < 1) requestAnimationFrame(step);
          };
          setN(0);
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {String(n).padStart(pad, "0")}
    </span>
  );
}
