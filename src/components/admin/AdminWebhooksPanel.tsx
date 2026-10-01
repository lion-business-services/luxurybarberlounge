"use client";

import Link from "next/link";
import { BadgeCheck, CalendarDays, WalletCards } from "lucide-react";
import { PortalHeader } from "@/components/portal/PortalUI";

export function AdminWebhooksPanel() {
  return <>
    <PortalHeader
      eyebrow="Payments"
      title="Payment updates"
      copy="Appointment and payment records update automatically as clients complete payment. No daily setup or technical action is required here."
      actions={<Link href="/admin/payments" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brass)] px-5 py-3 text-[10px] tracking-[.18em] uppercase text-[var(--color-ink)]"><WalletCards className="h-4 w-4" /> Payment tracking</Link>}
    />
    <div className="grid gap-4 md:grid-cols-3">
      <StatusCard icon={<WalletCards className="h-5 w-5" />} title="Payments" copy="Completed client payments are reflected in the shop’s payment records automatically." />
      <StatusCard icon={<CalendarDays className="h-5 w-5" />} title="Appointments" copy="Paid bookings move into the confirmed appointment schedule automatically." />
      <StatusCard icon={<BadgeCheck className="h-5 w-5" />} title="Shop records" copy="Payment and appointment information stays connected so staff can work from the normal admin screens." />
    </div>
  </>;
}

function StatusCard({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <article className="rounded-2xl border border-[var(--color-ink-line)] bg-white/[.02] p-5"><div className="flex items-center gap-2 text-[var(--color-brass)]">{icon}<span className="text-[9px] uppercase tracking-[.16em]">Automatic</span></div><h2 className="font-display mt-4 text-2xl">{title}</h2><p className="mt-3 text-sm leading-6 text-[var(--color-bone-muted)]">{copy}</p></article>;
}
