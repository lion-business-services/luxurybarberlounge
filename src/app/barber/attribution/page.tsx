import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { BarberAttributionPanel } from "@/components/attribution/BarberAttributionPanel";
export const metadata: Metadata = { title: "Attribution Claims", robots: { index: false, follow: false } };
export default function Page(){ return <PortalShell role="barber"><BarberAttributionPanel /></PortalShell>; }
