import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { BarberProfileEditor } from "@/components/barber/BarberProfileEditor";

export const metadata: Metadata = { title: "Your profile", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <PortalShell role="barber">
      <BarberProfileEditor />
    </PortalShell>
  );
}
