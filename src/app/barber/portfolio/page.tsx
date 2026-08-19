import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { BarberPortfolioManager } from "@/components/barber/BarberPortfolioManager";

export const metadata: Metadata = { title: "Portfolio", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <PortalShell role="barber">
      <BarberPortfolioManager />
    </PortalShell>
  );
}
