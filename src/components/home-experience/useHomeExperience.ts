"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useMotionValue, type MotionValue } from "motion/react";
import type { MotionTier } from "@/lib/motion/homeMotionConfig";
import { useAdaptiveMotionTier } from "@/lib/motion/useAdaptiveMotionTier";

export function useMotionTier(): MotionTier {
  const tier = useAdaptiveMotionTier();
  if (tier === "high") return "high";
  if (tier === "standard") return "standard";
  if (tier === "minimal") return "reduced";
  return "mobile";
}

type ScrollMode = "viewport" | "pinned" | "enter-to-end";

/**
 * A single IntersectionObserver-gated scroll value. Unlike one useScroll hook
 * per scene, this attaches no scroll work at all when the scene is static on a
 * mobile, low-power, or reduced-motion device.
 */
export function useAdaptiveScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled: boolean,
  mode: ScrollMode = "viewport",
): MotionValue<number> {
  const progress = useMotionValue(enabled ? 0 : 0.5);
  const frame = useRef(0);
  const visible = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!enabled) {
      progress.set(0.5);
      return;
    }

    const measure = () => {
      frame.current = 0;
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      let raw = 0;
      if (mode === "pinned") {
        raw = -rect.top / Math.max(1, rect.height - viewport);
      } else if (mode === "enter-to-end") {
        raw = (viewport - rect.top) / Math.max(1, rect.height);
      } else {
        raw = (viewport - rect.top) / Math.max(1, viewport + rect.height);
      }
      progress.set(Math.min(1, Math.max(0, raw)));
    };

    const schedule = () => {
      if (!visible.current || frame.current) return;
      frame.current = window.requestAnimationFrame(measure);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting);
        if (visible.current) schedule();
      },
      { threshold: 0, rootMargin: "120px 0px" },
    );

    observer.observe(element);
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, [enabled, mode, progress, ref]);

  return progress;
}

export function useVideoVisibility(ref: RefObject<HTMLVideoElement | null>, enabled: boolean) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    let pageVisible = !document.hidden;
    let inViewport = false;

    const sync = () => {
      if (enabled && pageVisible && inViewport) void video.play().catch(() => undefined);
      else video.pause();
    };

    if (!enabled) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = Boolean(entry?.isIntersecting);
        sync();
      },
      { threshold: 0.08, rootMargin: "180px 0px" },
    );
    const onVisibility = () => {
      pageVisible = !document.hidden;
      sync();
    };

    observer.observe(video);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      video.pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, ref]);
}
