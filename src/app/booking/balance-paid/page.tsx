import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { businessConfig } from "@/lib/config/business";

export const metadata: Metadata = {
  title: "Balance paid",
  robots: { index: false, follow: false },
};

export default async function BalancePaidPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref = "" } = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--color-ink)] px-5 py-16 text-[var(--color-bone)] sm:px-8">
      <section className="mx-auto max-w-2xl border border-[var(--color-brass)]/30 bg-[var(--color-ink-soft)] p-7 sm:p-12">
        <CheckCircle2 className="h-10 w-10 text-[var(--color-brass)]" />
        <p className="mt-6 text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">
          Paid in full
        </p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl">Thank you.</h1>
        <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">
          Your balance is settled. Nothing is due at the chair — just arrive a
          few minutes early and your barber will be ready for you.
        </p>
        {ref ? (
          <div className="mt-8 rounded-xl border border-[var(--color-ink-line)] p-5">
            <p className="text-[9px] tracking-[.2em] uppercase text-[var(--color-brass)]">
              Booking reference
            </p>
            <p className="font-display mt-2 text-2xl">{ref}</p>
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login?next=/client/appointments"
            className="inline-flex min-h-12 items-center rounded-full bg-[var(--color-brass)] px-5 text-[10px] tracking-[.16em] uppercase text-black"
          >
            Client portal
          </Link>
          <a
            href={businessConfig.phoneHref}
            className="inline-flex min-h-12 items-center rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] tracking-[.16em] uppercase"
          >
            Call the lounge
          </a>
        </div>
      </section>
    </main>
  );
}
