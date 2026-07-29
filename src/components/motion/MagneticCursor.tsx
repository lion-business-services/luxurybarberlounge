"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAdaptiveMotionTier } from "@/lib/motion/useAdaptiveMotionTier";
import { shouldUseCustomCursor } from "@/lib/motion/devicePerformance";

type MagnetBounds = { left: number; top: number; width: number; height: number };

/** Premium cursor for capable desktop hardware only. */
export function MagneticCursor() {
  const pathname = usePathname();
  const tier = useAdaptiveMotionTier();
  const active = shouldUseCustomCursor(tier, pathname);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    const root = document.documentElement;
    root.dataset.cursor = "on";

    let px = window.innerWidth / 2;
    let py = window.innerHeight / 2;
    let rx = px;
    let ry = py;
    let rw = 28;
    let rh = 28;
    let radius = 999;
    let targetW = 28;
    let targetH = 28;
    let targetR = 999;
    let magnet: HTMLElement | null = null;
    let bounds: MagnetBounds | null = null;
    let frame = 0;
    let running = false;
    let visible = false;

    const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

    const releaseMagnet = () => {
      if (magnet) magnet.style.transform = "";
      magnet = null;
      bounds = null;
      targetW = 28;
      targetH = 28;
      targetR = 999;
    };

    const tick = () => {
      frame = 0;
      if (!visible || document.hidden) {
        running = false;
        return;
      }

      rx = lerp(rx, px, 0.24);
      ry = lerp(ry, py, 0.24);
      rw = lerp(rw, targetW, 0.24);
      rh = lerp(rh, targetH, 0.24);
      radius = lerp(radius, targetR, 0.24);

      ring.style.transform = `translate3d(${rx - rw / 2}px,${ry - rh / 2}px,0)`;
      ring.style.width = `${rw}px`;
      ring.style.height = `${rh}px`;
      ring.style.borderRadius = `${radius}px`;
      dot.style.transform = `translate3d(${px - 3}px,${py - 3}px,0)`;

      if (magnet && bounds) {
        const dx = (px - (bounds.left + bounds.width / 2)) * 0.1;
        const dy = (py - (bounds.top + bounds.height / 2)) * 0.1;
        magnet.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0)`;
      }

      const settled = Math.abs(rx - px) < 0.08 && Math.abs(ry - py) < 0.08 && Math.abs(rw - targetW) < 0.08;
      if (settled && !magnet) {
        running = false;
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      frame = window.requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      px = event.clientX;
      py = event.clientY;
      const hit = (event.target as Element | null)?.closest?.("[data-magnetic]") as HTMLElement | null;
      if (hit !== magnet) {
        releaseMagnet();
        if (hit) {
          magnet = hit;
          const rect = hit.getBoundingClientRect();
          bounds = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
          const pad = 8;
          targetW = rect.width + pad * 2;
          targetH = rect.height + pad * 2;
          const parsed = Number.parseFloat(window.getComputedStyle(hit).borderRadius);
          targetR = Number.isFinite(parsed) && parsed > 0 ? parsed + pad : 8;
        }
      }
      start();
    };

    const onEnter = () => {
      visible = true;
      ring.style.opacity = "1";
      dot.style.opacity = "1";
      start();
    };
    const onLeave = () => {
      visible = false;
      ring.style.opacity = "0";
      dot.style.opacity = "0";
      releaseMagnet();
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      running = false;
    };
    const onVisibility = () => {
      if (document.hidden) onLeave();
    };
    const onResize = () => releaseMagnet();
    const onDown = () => ring.classList.add("is-pressed");
    const onUp = () => ring.classList.remove("is-pressed");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("pointerenter", onEnter);
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onLeave);

    return () => {
      delete root.dataset.cursor;
      releaseMagnet();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerenter", onEnter);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [active]);

  if (!active) return null;
  return (
    <div aria-hidden className="lbl-cursor-layer">
      <div ref={ringRef} className="lbl-cursor-ring" />
      <div ref={dotRef} className="lbl-cursor-dot" />
    </div>
  );
}
