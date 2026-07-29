import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { DemoModeBanner } from "@/components/portal/PortalUI";
import { AdminAttributionPanel } from "@/components/attribution/AdminAttributionPanel";
export const metadata: Metadata = { title: "Attribution", robots: { index: false, follow: false } };
export default function Page(){ return <PortalShell role="admin"><DemoModeBanner /><AdminAttributionPanel /></PortalShell>; }
