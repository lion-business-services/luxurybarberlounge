import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return <Link href="/" aria-label="Luxury Barber Lounge — Home" className={clsx("group inline-flex items-center gap-3 select-none",className)}>
    <Image src="/brand/luxury-barber-crest.png" alt="" width={48} height={48} className="h-11 w-11 object-contain drop-shadow-[0_0_16px_rgba(184,134,42,.22)]" priority />
    {!compact && <span className="flex flex-col leading-tight"><span className="font-display text-base text-[var(--color-bone)]">Luxury Barber Lounge</span><span className="text-[9px] tracking-[0.32em] uppercase text-[var(--color-bone-muted)]">Craft · Confidence · Ritual</span></span>}
  </Link>
}
