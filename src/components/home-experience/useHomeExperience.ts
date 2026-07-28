"use client";

import { useEffect, useState, type RefObject } from "react";
import type { MotionTier } from "@/lib/motion/homeMotionConfig";

export function useMotionTier(): MotionTier {
  const [tier, setTier] = useState<MotionTier>("standard");

  useEffect(() => {
    const update = () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return setTier("reduced");
      const width = window.innerWidth;
      const fine = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
      const cores = navigator.hardwareConcurrency ?? 8;
      if (width < 720 || memory <= 4 || cores <= 4) return setTier("mobile");
      if (width < 1180 || !fine) return setTier("standard");
      setTier("high");
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return tier;
}

export function useVideoVisibility(ref: RefObject<HTMLVideoElement | null>, enabled: boolean) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!enabled) {
      video.pause();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.22 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [enabled, ref]);
}
