"use client";

import { useEffect, useRef } from "react";
import { Scissors, Sparkles, Crown } from "lucide-react";

export function ScrollDiscover() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onScroll = () => {
      const rect = node.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, 1 - rect.top / innerHeight));
      node.style.setProperty("--discover", String(p));
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={ref} className="discover-scene min-h-[140vh] border-y border-[var(--color-ink-line)]">
      <div className="sticky top-20 mx-auto flex min-h-[calc(100svh-5rem)] max-w-6xl items-center px-6 sm:px-10">
        <div className="grid w-full gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="section-kicker">Scroll to discover</p>
            <h2 className="font-display mt-5 text-4xl leading-tight sm:text-6xl">Craft becomes <span className="italic text-[var(--color-brass)]">ritual.</span></h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-[var(--color-bone-muted)]">Every layer reveals the lounge experience: consultation, precision work, and a finish designed around the client rather than the clock.</p>
          </div>
          <div className="discover-stage" aria-label="Animated barber craftsmanship presentation">
            <div className="discover-orbit orbit-one"><Scissors /></div>
            <div className="discover-orbit orbit-two"><Sparkles /></div>
            <div className="discover-orbit orbit-three"><Crown /></div>
            <div className="discover-card discover-back">Consultation</div>
            <div className="discover-card discover-mid">Precision</div>
            <div className="discover-card discover-front"><span>THE FINISH</span><strong>Confidence, refined.</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}
