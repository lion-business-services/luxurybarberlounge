import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { DemoModeBanner } from "@/components/portal/PortalUI";
import { QueueOperationsPanel } from "@/components/operations/QueueOperationsPanel";
export const metadata: Metadata = { title: "Queue", robots: { index: false, follow: false } };
export default function Page() { return <PortalShell role="admin"><DemoModeBanner /><QueueOperationsPanel /></PortalShell>; }
