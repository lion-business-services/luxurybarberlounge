import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { DemoModeBanner } from "@/components/portal/PortalUI";
import { BarberAttributionPanel } from "@/components/attribution/BarberAttributionPanel";
export const metadata: Metadata = { title: "Attribution Claims", robots: { index: false, follow: false } };
export default function Page(){ return <PortalShell role="barber"><DemoModeBanner /><BarberAttributionPanel /></PortalShell>; }
