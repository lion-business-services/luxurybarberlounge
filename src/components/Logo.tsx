import Link from "next/link";
import clsx from "clsx";

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Luxury Barber Lounge — Home"
      className={clsx(
        "group inline-flex items-center gap-3 select-none",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-brass)]/60 text-[var(--color-brass)] transition-colors group-hover:border-[var(--color-brass)]"
      >
        <span className="font-display text-base leading-none">L</span>
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="font-display text-base text-[var(--color-bone)]">
            Luxury Barber Lounge
          </span>
          <span className="text-[10px] tracking-[0.32em] uppercase text-[var(--color-bone-muted)]">
            Est. MMXXVI
          </span>
        </span>
      )}
    </Link>
  );
}
