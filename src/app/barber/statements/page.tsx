import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { CommissionWorkspace } from "@/components/commissions/CommissionWorkspace";
export const metadata: Metadata = { title: "Statements", robots: { index: false, follow: false } };
export default function Page() { return <PortalShell role="barber"><CommissionWorkspace role="barber" /></PortalShell>; }
