import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";

/**
 * Brand lockup. The crest is the official artwork; the wordmark stays live text
 * so it renders crisply at any size and remains selectable and translatable.
 */
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
      data-magnetic
      className={clsx(
        "group inline-flex items-center gap-3 select-none",
        className,
      )}
    >
      <span
        aria-hidden
        className="relative block h-10 w-10 shrink-0 transition-transform duration-500 group-hover:scale-105"
      >
        <Image
          src="/brand/lbl-crest.webp"
          alt=""
          fill
          sizes="40px"
          className="object-contain"
          priority
        />
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
