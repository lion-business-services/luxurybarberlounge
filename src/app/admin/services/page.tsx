import type { Metadata } from "next";
import { AdminServicesManager } from "@/components/admin/AdminServicesManager";

export const metadata: Metadata = { title: "Services", robots: { index: false, follow: false } };

export default function Page() {
  return <div className="grid gap-6"><header><p className="text-[9px] uppercase tracking-[.24em] text-[var(--color-brass)]">Service menu</p><h1 className="font-display mt-3 text-4xl sm:text-5xl">Services</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-bone-muted)]">Keep the menu accurate, set duration and pricing, and choose what clients can book.</p></header><AdminServicesManager /></div>;
}
