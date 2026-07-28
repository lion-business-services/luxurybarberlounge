"use client";

import { useEffect, useState } from "react";

export type PerformanceTier = "full" | "reduced" | "minimal";

type NetworkInfo = { saveData?: boolean };
type ExtendedNavigator = Navigator & {
  connection?: NetworkInfo;
  deviceMemory?: number;
};

/**
 * Decides how much motion this device should actually run.
 *
 *  full     desktop, fine pointer, healthy CPU/RAM  → everything
 *  reduced  phones, tablets, modest hardware        → images yes, particles no
 *  minimal  prefers-reduced-motion or save-data     → static composition
 *
 * Resolved after mount so server and client markup always agree.
 */
export function useHeroPerformanceMode(): PerformanceTier {
  const [tier, setTier] = useState<PerformanceTier>("reduced");

  useEffect(() => {
    const nav = navigator as ExtendedNavigator;

    const compute = (): PerformanceTier => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "minimal";
      if (nav.connection?.saveData) return "minimal";

      const cores = nav.hardwareConcurrency ?? 4;
      const memory = nav.deviceMemory ?? 4;
      const fine = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
      const wide = window.innerWidth >= 1024;

      if (cores <= 4 || memory <= 4) return "reduced";
      return fine && wide ? "full" : "reduced";
    };

    const apply = () => setTier(compute());
    apply();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", apply);
    window.addEventListener("resize", apply, { passive: true });
    return () => {
      motionQuery.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  return tier;
}
