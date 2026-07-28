import type { ReactNode } from "react";
import clsx from "clsx";

export function LuxuryCard({
  children,
  className,
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]/72 p-6 transition duration-500",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--color-brass)]/45 before:to-transparent",
        elevated && "shadow-[0_30px_80px_rgba(0,0,0,.32)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
