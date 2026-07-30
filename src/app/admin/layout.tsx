import { PortalAccessGate } from "@/components/portal/PortalAccessGate";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalAccessGate root="/admin" allowed={["manager", "owner", "super_admin"]}><AdminShell>{children}</AdminShell></PortalAccessGate>;
}
