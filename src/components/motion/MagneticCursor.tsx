"use client";

import { useEffect, useRef } from "react";
import { useFinePointer, useReducedMotion } from "@/lib/motion/hooks";

/**
 * Magnetic cursor.
 *
 * A brass ring trails the pointer with eased interpolation; a small dot tracks
 * it exactly. Over any element carrying `data-magnetic`, the ring snaps to that
 * element's centre, adopts its shape, and the element itself drifts a few pixels
 * toward the pointer — the "magnet" effect.
 *
 * Guardrails, so this never becomes the laggy cursor everyone hates:
 *  - renders nothing on touch/coarse pointers or when reduced motion is set
 *  - one rAF loop, transform-only writes, no React state per frame
 *  - the loop parks itself when the pointer leaves the window
 *  - the real cursor is only hidden while ours is active (see globals.css)
 */
export function MagneticCursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const active = fine && !reduced;

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
    let raf = 0;
    let running = false;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      raf = 0;
      // Ring easing: soft follow. Dot is exact, so precision never suffers.
      rx = lerp(rx, px, 0.18);
      ry = lerp(ry, py, 0.18);
      rw = lerp(rw, targetW, 0.2);
      rh = lerp(rh, targetH, 0.2);
      radius = lerp(radius, targetR, 0.2);

      ring.style.transform = `translate3d(${rx - rw / 2}px, ${ry - rh / 2}px, 0)`;
      ring.style.width = `${rw}px`;
      ring.style.height = `${rh}px`;
      ring.style.borderRadius = `${radius}px`;
      dot.style.transform = `translate3d(${px - 3}px, ${py - 3}px, 0)`;

      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const dx = (px - (r.left + r.width / 2)) * 0.16;
        const dy = (py - (r.top + r.height / 2)) * 0.16;
        magnet.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
      }

      const settled =
        Math.abs(rx - px) < 0.1 &&
        Math.abs(ry - py) < 0.1 &&
        Math.abs(rw - targetW) < 0.1;
      if (settled && !magnet) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const releaseMagnet = () => {
      if (!magnet) return;
      magnet.style.transform = "";
      magnet.style.transition = "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)";
      const el = magnet;
      window.setTimeout(() => {
        el.style.transition = "";
      }, 440);
      magnet = null;
    };

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;

      const hit = (e.target as Element | null)?.closest?.(
        "[data-magnetic]",
      ) as HTMLElement | null;

      if (hit !== magnet) {
        releaseMagnet();
        if (hit) {
          magnet = hit;
          magnet.style.transition = "";
          const r = hit.getBoundingClientRect();
          const pad = 10;
          targetW = r.width + pad * 2;
          targetH = r.height + pad * 2;
          const cs = window.getComputedStyle(hit).borderRadius;
          const parsed = Number.parseFloat(cs);
          targetR = Number.isFinite(parsed) && parsed > 0 ? parsed + pad : 8;
        } else {
          targetW = 28;
          targetH = 28;
          targetR = 999;
        }
      }
      start();
    };

    const onEnter = () => {
      ring.style.opacity = "1";
      dot.style.opacity = "1";
      start();
    };
    const onLeave = () => {
      ring.style.opacity = "0";
      dot.style.opacity = "0";
      releaseMagnet();
    };
    const onDown = () => ring.classList.add("is-pressed");
    const onUp = () => ring.classList.remove("is-pressed");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerenter", onEnter);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      delete root.dataset.cursor;
      releaseMagnet();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerenter", onEnter);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      if (raf) cancelAnimationFrame(raf);
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
