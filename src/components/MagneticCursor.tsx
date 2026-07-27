"use client";

import { useEffect, useRef } from "react";

export function MagneticCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer:fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;

    let x = innerWidth / 2;
    let y = innerHeight / 2;
    let rx = x;
    let ry = y;
    let raf = 0;

    const move = (event: MouseEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px,${y}px,0)`;
    };
    const loop = () => {
      rx += (x - rx) * 0.14;
      ry += (y - ry) * 0.14;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      raf = requestAnimationFrame(loop);
    };
    const enter = (event: Event) => {
      const target = event.target as HTMLElement;
      const active = Boolean(target.closest("a,button,[data-magnetic]"));
      ring.current?.classList.toggle("cursor-active", active);
    };

    addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", enter, { passive: true });
    loop();
    return () => {
      removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", enter);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden />
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  );
}
