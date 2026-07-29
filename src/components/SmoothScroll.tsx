"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAdaptiveMotionTier } from "@/lib/motion/useAdaptiveMotionTier";
import { shouldUseSmoothScroll } from "@/lib/motion/devicePerformance";

/**
 * Desktop-only progressive enhancement. Touch devices, operational portals,
 * reduced-motion users, data-saver users, and modest hardware keep native
 * scrolling. Lenis is dynamically imported so it never enters those bundles.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tier = useAdaptiveMotionTier();
  const enabled = shouldUseSmoothScroll(tier, pathname);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let frame = 0;
    let lenis: import("@studio-freight/lenis").default | null = null;

    const start = async () => {
      const { default: Lenis } = await import("@studio-freight/lenis");
      if (cancelled) return;

      lenis = new Lenis({
        duration: 0.9,
        easing: (value) => 1 - Math.pow(1 - value, 4),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.9,
        touchMultiplier: 1,
      });

      const tick = (time: number) => {
        frame = 0;
        if (!document.hidden) lenis?.raf(time);
        if (!cancelled) frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    };

    void start();
    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, [enabled, pathname]);

  return <>{children}</>;
}
