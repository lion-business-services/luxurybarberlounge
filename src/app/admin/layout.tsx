import { PortalAccessGate } from "@/components/portal/PortalAccessGate";

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalAccessGate root="/admin" allowed={["manager", "owner", "super_admin"]}>{children}</PortalAccessGate>;
}
