import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { businessConfig } from "@/lib/config/business";

// Booking/payment UI must never be served from a stale prerender after an
// operational or payment-rule deployment. Always render the current release.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Choose a real available service, barber, date, and time at Luxury Barber Lounge in Northfield, New Jersey.",
  alternates: { canonical: businessConfig.bookingPath },
};

export default function BookPage() {
  return <main className="min-h-screen bg-[var(--color-ink)] px-4 pb-24 pt-20 text-[var(--color-bone)] sm:px-8"><header className="mx-auto mb-10 max-w-6xl"><p className="text-[10px] tracking-[.3em] uppercase text-[var(--color-brass)]">Northfield · Secure online booking</p><h1 className="font-display mt-4 max-w-4xl text-5xl leading-[.95] sm:text-7xl">Reserve your chair.</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--color-bone-muted)]">Choose a service, eligible barber, and real available time. No account is required to book.</p><p className="mt-3 text-xs text-[var(--color-bone-muted)]">{businessConfig.address.line1}, {businessConfig.address.city}, {businessConfig.address.region} · {businessConfig.phone}</p></header><div className="mx-auto max-w-6xl"><Suspense fallback={<div className="h-[620px] animate-pulse border border-[var(--color-ink-line)] bg-white/5" />}><BookingFlow /></Suspense></div></main>;
}