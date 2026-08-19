import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { businessConfig } from "@/lib/config/business";

export const metadata: Metadata = {
  title: "Balance payment",
  robots: { index: false, follow: false },
};

const reasons: Record<string, { title: string; copy: string }> = {
  invalid: {
    title: "This payment link is no longer valid.",
    copy: "The link may have expired or already been replaced by a newer confirmation email. Please call the lounge and we will take the balance over the phone or at your visit.",
  },
  cancelled: {
    title: "This appointment was cancelled.",
    copy: "There is no balance to collect. If you believe this is a mistake, please call the lounge.",
  },
  already_paid: {
    title: "This balance is already paid.",
    copy: "Nothing further is due. We look forward to seeing you.",
  },
  nothing_due: {
    title: "No balance is outstanding.",
    copy: "Your appointment is fully paid. We look forward to seeing you.",
  },
  square: {
    title: "We could not open the payment page.",
    copy: "Square did not return a checkout link. Please try again shortly, or settle the balance at your visit.",
  },
  rate: {
    title: "Too many attempts.",
    copy: "Please wait a moment and try the link again.",
  },
};

export default async function BalanceErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason = "invalid" } = await searchParams;
  const entry = reasons[reason] ?? reasons.invalid;

  return (
    <main className="min-h-screen bg-[var(--color-ink)] px-5 py-16 text-[var(--color-bone)] sm:px-8">
      <section className="mx-auto max-w-2xl border border-[var(--color-brass)]/30 bg-[var(--color-ink-soft)] p-7 sm:p-12">
        <AlertCircle className="h-10 w-10 text-amber-400" />
        <h1 className="font-display mt-6 text-3xl sm:text-4xl">{entry.title}</h1>
        <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">{entry.copy}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={businessConfig.phoneHref}
            className="inline-flex min-h-12 items-center rounded-full bg-[var(--color-brass)] px-5 text-[10px] tracking-[.16em] uppercase text-black"
          >
            Call {businessConfig.phone}
          </a>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-full border border-[var(--color-ink-line)] px-5 text-[10px] tracking-[.16em] uppercase"
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
