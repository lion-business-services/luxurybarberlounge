import type { Metadata } from "next";
import { BarberAvailabilityManager } from "@/components/barber/BarberAvailabilityManager";
import { PortalHeader } from "@/components/portal/PortalUI";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata: Metadata = { title: "Calendar & Availability", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <PortalShell role="barber">
      <PortalHeader
        eyebrow="Barber workspace"
        title="Calendar & availability"
        copy="Your normal schedule, date-specific availability, unavailable time, and booking calendar in one place."
      />
      <BarberAvailabilityManager />
    </PortalShell>
  );
}
