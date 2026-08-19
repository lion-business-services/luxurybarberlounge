import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { businessConfig } from "@/lib/config/business";

export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: false } };

export default async function MembershipWelcome({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan = "" } = await searchParams;
  const name = plan === "annual-52-week" ? "1 Year Membership" : plan === "monthly-4-week" ? "1 Month Membership" : "membership";

  return (
    <main className="min-h-screen bg-[var(--color-ink)] px-5 py-16 text-[var(--color-bone)] sm:px-8">
      <section className="mx-auto max-w-2xl border border-[var(--color-brass)]/30 bg-[var(--color-ink-soft)] p-7 sm:p-12">
        <CheckCircle2 className="h-10 w-10 text-[var(--color-brass)]" />
        <p className="mt-6 text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Membership active</p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl">Welcome to the Lounge.</h1>
        <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">
          Your {name} is confirmed. Your card is stored securely by Square and
          will renew automatically — you can cancel any time by calling the
          lounge. A receipt is on its way to your inbox.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/book" className="inline-flex min-h-12 items-center rounded-full bg-[var(--color-brass)] px-5 text-[10px] tracking-[.16em] uppercase text-black">
            Book your first visit
          </Link>
          <a href={businessConfig.phoneHref} className="inline-flex min-h-12 items-center rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] tracking-[.16em] uppercase">
            Call the lounge
          </a>
        </div>
      </section>
    </main>
  );
}
