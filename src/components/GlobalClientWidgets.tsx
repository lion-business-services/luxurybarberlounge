"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isOperationalRoute } from "@/lib/motion/devicePerformance";
import { useAdaptiveMotionTier } from "@/lib/motion/useAdaptiveMotionTier";

const MobileActions = dynamic(() => import("./MobileActions").then((module) => module.MobileActions), {
  ssr: false,
});
const ConciergeWidget = dynamic(
  () => import("./public/ConciergeWidget").then((module) => module.ConciergeWidget),
  { ssr: false },
);
const CookiePreferences = dynamic(
  () => import("./public/CookiePreferences").then((module) => module.CookiePreferences),
  { ssr: false },
);
const MagneticCursor = dynamic(
  () => import("./motion/MagneticCursor").then((module) => module.MagneticCursor),
  { ssr: false },
);

const AUTH_ROUTES = new Set(["/login", "/register", "/forgot-password"]);

export function GlobalClientWidgets() {
  const pathname = usePathname();
  const tier = useAdaptiveMotionTier();
  const [idleReady, setIdleReady] = useState(false);
  const operational = isOperationalRoute(pathname) || pathname.startsWith("/kiosk") || AUTH_ROUTES.has(pathname);

  useEffect(() => {
    if (operational) return;
    let timeout = 0;
    let idle = 0;
    const browser = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const activate = () => setIdleReady(true);
    if (browser.requestIdleCallback) idle = browser.requestIdleCallback(activate, { timeout: 1500 });
    else timeout = window.setTimeout(activate, 850);
    return () => {
      if (idle) browser.cancelIdleCallback?.(idle);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [operational, pathname]);

  if (operational) return null;

  return (
    <>
      <MobileActions />
      {tier === "high" ? <MagneticCursor /> : null}
      {idleReady ? <ConciergeWidget /> : null}
      {idleReady ? <CookiePreferences /> : null}
    </>
  );
}
