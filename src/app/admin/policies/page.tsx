import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { DemoModeBanner } from "@/components/portal/PortalUI";
import { PolicyGovernancePanel } from "@/components/admin/PolicyGovernancePanel";

export const metadata: Metadata = { title: "Policy Governance", robots: { index: false, follow: false } };
export default function Page() { return <PortalShell role="admin"><DemoModeBanner /><PolicyGovernancePanel /></PortalShell>; }
