export const homeMotion = {
  ease: [0.22, 1, 0.36, 1] as const,
  spring: { stiffness: 120, damping: 24, mass: 0.45 },
  softSpring: { stiffness: 80, damping: 26, mass: 0.7 },
  desktop: { perspective: 1400, pointer: 18, rotate: 2.2 },
  tablet: { perspective: 1100, pointer: 0, rotate: 1 },
  mobile: { perspective: 900, pointer: 0, rotate: 0.4 },
} as const;

export type MotionTier = "high" | "standard" | "mobile" | "reduced";
