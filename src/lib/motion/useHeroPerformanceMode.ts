"use client";

import { useAdaptiveMotionTier } from "./useAdaptiveMotionTier";

export type PerformanceTier = "full" | "reduced" | "minimal";

/** Maps the shared site-wide device tier to the hero's three visual modes. */
export function useHeroPerformanceMode(): PerformanceTier {
  const tier = useAdaptiveMotionTier();
  if (tier === "high") return "full";
  if (tier === "minimal") return "minimal";
  return "reduced";
}
