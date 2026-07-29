"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  classifyMotionTier,
  type AdaptiveMotionTier,
  type DevicePerformanceSignals,
} from "./devicePerformance";

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

type PerformanceNavigator = Navigator & {
  connection?: NetworkInformation;
  deviceMemory?: number;
};

const AdaptiveMotionContext = createContext<AdaptiveMotionTier>("minimal");

function readSignals(): DevicePerformanceSignals {
  const nav = navigator as PerformanceNavigator;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: Boolean(nav.connection?.saveData),
    effectiveType: nav.connection?.effectiveType,
    finePointer: window.matchMedia("(pointer: fine) and (hover: hover)").matches,
    touch: window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
  };
}

/** One shared capability observer for the complete application. */
export function AdaptiveMotionProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<AdaptiveMotionTier>("minimal");

  useEffect(() => {
    const nav = navigator as PerformanceNavigator;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(pointer: fine) and (hover: hover)");
    let resizeFrame = 0;

    const apply = () => setTier(classifyMotionTier(readSignals()));
    const schedule = () => {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        apply();
      });
    };

    apply();
    motion.addEventListener("change", apply);
    pointer.addEventListener("change", apply);
    nav.connection?.addEventListener?.("change", apply);
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });

    return () => {
      motion.removeEventListener("change", apply);
      pointer.removeEventListener("change", apply);
      nav.connection?.removeEventListener?.("change", apply);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    };
  }, []);

  return <AdaptiveMotionContext.Provider value={tier}>{children}</AdaptiveMotionContext.Provider>;
}

export function useAdaptiveMotionTier(): AdaptiveMotionTier {
  return useContext(AdaptiveMotionContext);
}
