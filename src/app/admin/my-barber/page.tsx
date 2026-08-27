import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CircleDollarSign, Scissors } from "lucide-react";

import { BarberAvailabilityManager } from "@/components/barber/BarberAvailabilityManager";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

export const metadata: Metadata = { title: "My Barber Portal", robots: { index: false, follow: false } };

export default async function Page() {
  const session = await getServerAuthSession();
  const admin = createUntypedAdminSupabase();

  const { data: barber } = admin && session.user
    ? await admin
        .from("barber_profiles")
        .select("id,display_name,professional_title,availability_status,accepting_walk_ins")
        .eq("staff_user_id", session.user.id)
        .eq("active", true)
        .maybeSingle()
    : { data: null };

  if (!barber?.id) {
    return (
      <section className="portal-card">
        <p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Owner barber workspace</p>
        <h1 className="font-display mt-3 text-3xl">My Barber Portal</h1>
        <p className="mt-3 text-sm text-[var(--color-bone-muted)]">No active barber profile is linked to this owner account.</p>
      </section>
    );
  }

  const name = typeof barber.display_name === "string" ? barber.display_name : "My barber profile";

  return (
    <div className="grid gap-6">
      <section className="portal-card">
        <p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Owner barber workspace</p>
        <h1 className="font-display mt-3 text-3xl">My Barber Portal</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-bone-muted)]">{name} — manage your own appointments, schedule, availability, and barber pay without a separate login or duplicate dashboard.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Link href={`/admin/appointments?barber=${encodeURIComponent(session.user!.id)}`} className="rounded-xl border border-[var(--color-ink-line)] p-4 transition hover:border-[var(--color-brass)]"><CalendarDays className="h-5 w-5 text-[var(--color-brass)]" /><strong className="mt-3 block text-sm">My appointments</strong><span className="mt-1 block text-xs text-[var(--color-bone-muted)]">Open your appointment schedule</span></Link>
          <Link href="/admin/commissions" className="rounded-xl border border-[var(--color-ink-line)] p-4 transition hover:border-[var(--color-brass)]"><CircleDollarSign className="h-5 w-5 text-[var(--color-brass)]" /><strong className="mt-3 block text-sm">My commissions</strong><span className="mt-1 block text-xs text-[var(--color-bone-muted)]">Review calculated barber amounts</span></Link>
          <Link href={`/admin/barbers/${barber.id}`} className="rounded-xl border border-[var(--color-ink-line)] p-4 transition hover:border-[var(--color-brass)]"><Scissors className="h-5 w-5 text-[var(--color-brass)]" /><strong className="mt-3 block text-sm">My profile</strong><span className="mt-1 block text-xs text-[var(--color-bone-muted)]">Open your barber profile controls</span></Link>
        </div>
      </section>
      <BarberAvailabilityManager barberProfileId={String(barber.id)} />
    </div>
  );
}
