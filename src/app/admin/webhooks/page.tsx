import type { Metadata } from "next";
import { AdminWebhooksPanel } from "@/components/admin/AdminWebhooksPanel";
import { DemoModeBanner } from "@/components/portal/PortalUI";

export const metadata: Metadata = { title: "Webhook Operations", robots: { index: false, follow: false } };

export default function Page() {
  return <><DemoModeBanner /><AdminWebhooksPanel /></>;
}
