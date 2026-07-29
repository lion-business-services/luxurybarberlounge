"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useAdaptiveMotionTier } from "./useAdaptiveMotionTier";

/** True when the site should avoid continuous or scrubbed motion. */
export function useReducedMotion(): boolean {
  return useAdaptiveMotionTier() === "minimal";
}

/** True only for desktop-class precise pointers. Never true on touch. */
export function useFinePointer(): boolean {
  const tier = useAdaptiveMotionTier();
  return tier === "high" || tier === "standard";
}

/**
 * Adds `data-inview="true"` once the element enters the viewport.
 * One-shot by default so content never flickers on scroll-back.
 */
export function useInView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { threshold = 0.18, once = true }: { threshold?: number; once?: boolean } = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.inview = "true";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.dataset.inview = "true";
            if (once) io.unobserve(el);
          } else if (!once) {
            el.dataset.inview = "false";
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, once]);
}

/**
 * Writes the element's scroll progress (0 → 1 across the viewport) into the
 * CSS custom property `--sp`, and the signed centre offset into `--sc` (-1 → 1).
 *
 * Deliberately does NOT trigger React re-renders: one rAF-throttled style write
 * per frame, gated by an IntersectionObserver so offscreen scenes cost nothing.
 */
export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled = true,
) {
  const frame = useRef(0);
  const visible = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.setProperty("--sp", "1");
      el.style.setProperty("--sc", "0");
      return;
    }

    const measure = () => {
      frame.current = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the top edge first appears, 1 once the bottom edge has passed.
      const raw = (vh - rect.top) / (vh + rect.height);
      const sp = Math.min(1, Math.max(0, raw));
      // -1 above centre, 0 at centre, 1 below centre.
      const centre = (rect.top + rect.height / 2 - vh / 2) / (vh / 2);
      const sc = Math.min(1, Math.max(-1, centre));
      el.style.setProperty("--sp", sp.toFixed(4));
      el.style.setProperty("--sc", sc.toFixed(4));
    };

    const schedule = () => {
      if (!visible.current || frame.current) return;
      frame.current = requestAnimationFrame(measure);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.current = entry.isIntersecting;
          if (entry.isIntersecting) schedule();
        }
      },
      { threshold: 0 },
    );
    io.observe(el);

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [ref, enabled]);
}
