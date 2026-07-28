declare module "motion/react" {
  import * as React from "react";

  export interface MotionValue<T = number> {
    get(): T;
    set(value: T): void;
    on(event: "change", listener: (value: T) => void): () => void;
  }

  export type MotionStyle = React.CSSProperties | Record<string, unknown>;
  export type MotionProps = {
    style?: MotionStyle;
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
    whileHover?: unknown;
    whileTap?: unknown;
    whileInView?: unknown;
    viewport?: unknown;
    layout?: boolean | string;
    variants?: Record<string, unknown>;
  };

  type MotionComponent<Tag extends keyof React.JSX.IntrinsicElements> = React.ForwardRefExoticComponent<
    React.PropsWithoutRef<Omit<React.JSX.IntrinsicElements[Tag], keyof MotionProps | "style"> & MotionProps> & React.RefAttributes<HTMLElement>
  >;

  export const motion: {
    div: MotionComponent<"div">;
    span: MotionComponent<"span">;
    section: MotionComponent<"section">;
    article: MotionComponent<"article">;
    p: MotionComponent<"p">;
    h1: MotionComponent<"h1">;
    h2: MotionComponent<"h2">;
    a: MotionComponent<"a">;
    button: MotionComponent<"button">;
    path: MotionComponent<"path">;
  };

  export function useMotionValue<T>(initial: T): MotionValue<T>;
  export function useSpring<T>(value: MotionValue<T>, options?: Record<string, number>): MotionValue<T>;
  export function useTransform<T, U>(
    value: MotionValue<T>,
    input: T[],
    output: U[],
    options?: Record<string, unknown>,
  ): MotionValue<U>;
  export function useTransform<T>(transformer: () => T): MotionValue<T>;
  export function useScroll(options?: Record<string, unknown>): {
    scrollX: MotionValue<number>;
    scrollY: MotionValue<number>;
    scrollXProgress: MotionValue<number>;
    scrollYProgress: MotionValue<number>;
  };
  export function useReducedMotion(): boolean | null;
  export function useInView(ref: React.RefObject<Element | null>, options?: Record<string, unknown>): boolean;
  export function useMotionTemplate(strings: TemplateStringsArray, ...values: Array<MotionValue<unknown> | string | number>): MotionValue<string>;
  export const AnimatePresence: React.ComponentType<{ children?: React.ReactNode; mode?: string; initial?: boolean }>;
}
