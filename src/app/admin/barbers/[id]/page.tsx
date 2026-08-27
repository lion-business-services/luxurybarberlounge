import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { AdminBarberDetail } from "@/components/admin/AdminPages";
import { BarberAvailabilityManager } from "@/components/barber/BarberAvailabilityManager";

export const metadata: Metadata = { title: "Barber Record", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="grid gap-6">
      <section id="schedule-availability" className="portal-card scroll-mt-24">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-[var(--color-brass)]" />
          <div>
            <p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Admin scheduling control</p>
            <h1 className="font-display mt-2 text-3xl">Schedule &amp; Availability</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">
              Manage this barber&apos;s normal schedule and date-specific availability from here. Changes feed the same backend used by public booking, so unavailable time is blocked and added availability becomes bookable automatically.
            </p>
          </div>
        </div>
      </section>
      <BarberAvailabilityManager barberProfileId={id} />
      <AdminBarberDetail id={id} />
    </div>
  );
}
