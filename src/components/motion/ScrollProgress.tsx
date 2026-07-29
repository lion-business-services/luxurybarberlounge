"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isOperationalRoute } from "@/lib/motion/devicePerformance";

/** Lightweight read-progress rule. It is disabled in operational workspaces. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const disabled = isOperationalRoute(pathname) || pathname.startsWith("/kiosk");

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      el.style.transform = `scaleX(${max > 0 ? doc.scrollTop / max : 0})`;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [disabled]);

  if (disabled) return null;
  return <div aria-hidden className="lbl-progress"><div ref={ref} /></div>;
}
