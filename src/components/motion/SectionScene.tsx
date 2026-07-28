"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from "motion/react";
import clsx from "clsx";

/**
 * Scroll-linked motion for the homepage sections below the hero.
 *
 * Each section becomes its own small scroll scene: content drifts and settles
 * as it crosses the viewport, and an optional backdrop moves at a slower rate
 * to create depth against it. Driven by Motion values, so scrolling never
 * triggers a React render. Reduced motion renders everything flat and still.
 */

function useSectionProgress(ref: React.RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  return useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
}

/**
 * Wraps a homepage section and gives its children a gentle depth settle:
 * content rises slightly, reaches rest while centred, and eases away on exit.
 */
export function SectionScene({
  children,
  className,
  intensity = 1,
  id,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const p = useSectionProgress(ref);

  const y = useTransform(p, [0, 0.5, 1], [34 * intensity, 0, -26 * intensity]);
  const opacity = useTransform(p, [0, 0.16, 0.86, 1], [0.5, 1, 1, 0.65]);
  const scale = useTransform(p, [0, 0.5, 1], [0.985, 1, 0.99]);

  if (reduced) {
    return (
      <section ref={ref} id={id} className={className}>
        {children}
      </section>
    );
  }

  return (
    <section ref={ref} id={id} className={clsx("relative", className)}>
      <motion.div style={{ y, opacity, scale }} className="will-change-transform">
        {children}
      </motion.div>
    </section>
  );
}

/**
 * A slow-moving image behind a section. Travels at roughly a third of scroll
 * speed, which reads as distance without ever pulling focus from the copy.
 */
export function ParallaxBackdrop({
  src,
  opacity = 0.18,
  className,
}: {
  src: string;
  opacity?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.5 });
  const y = useTransform(p, [0, 1], ["-9%", "9%"]);
  const scale = useTransform(p, [0, 0.5, 1], [1.1, 1.16, 1.1]);

  return (
    <div ref={ref} aria-hidden className={clsx("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <motion.div
        className="absolute inset-[-12%] bg-cover bg-center"
        style={{
          backgroundImage: `url(${src})`,
          opacity,
          ...(reduced ? {} : { y, scale }),
        }}
      />
      <div className="absolute inset-0 bg-[var(--color-ink)]/72" />
    </div>
  );
}

/** Staggered child entrance for grids of cards. */
export function StaggerItem({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
