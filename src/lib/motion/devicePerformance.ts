export type AdaptiveMotionTier = "high" | "standard" | "tablet" | "mobile" | "minimal";

export type DevicePerformanceSignals = {
  width: number;
  height: number;
  reducedMotion: boolean;
  saveData: boolean;
  effectiveType?: string;
  finePointer: boolean;
  touch: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

const OPERATIONAL_ROUTE = /^\/(?:client|barber|reception|admin|kiosk)(?:\/|$)/;

export function isOperationalRoute(pathname: string): boolean {
  return OPERATIONAL_ROUTE.test(pathname);
}

export function classifyMotionTier(signals: DevicePerformanceSignals): AdaptiveMotionTier {
  const {
    width,
    reducedMotion,
    saveData,
    effectiveType,
    finePointer,
    touch,
    deviceMemory = 4,
    hardwareConcurrency = 4,
  } = signals;

  if (reducedMotion || saveData || effectiveType === "slow-2g" || effectiveType === "2g") {
    return "minimal";
  }

  if (deviceMemory <= 2 || hardwareConcurrency <= 2) return "minimal";
  if (width < 768) return "mobile";
  if (touch || !finePointer || width < 1024) return "tablet";

  if (width >= 1440 && deviceMemory >= 8 && hardwareConcurrency >= 8) return "high";
  return "standard";
}

export function shouldUseSmoothScroll(tier: AdaptiveMotionTier, pathname: string): boolean {
  if (isOperationalRoute(pathname)) return false;
  return tier === "high";
}

export function shouldUseCustomCursor(tier: AdaptiveMotionTier, pathname: string): boolean {
  if (isOperationalRoute(pathname)) return false;
  return tier === "high";
}
