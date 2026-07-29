import type { Metadata } from "next";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { DemoModeBanner } from "@/components/portal/PortalUI";

export const metadata: Metadata = { title: "Users and Invitations", robots: { index: false, follow: false } };

export default function Page() {
  return <><DemoModeBanner /><AdminUsersPanel /></>;
}
