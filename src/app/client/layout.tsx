import { PortalAccessGate } from "@/components/portal/PortalAccessGate";

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalAccessGate root="/client" allowed={["client", "owner", "super_admin"]}>{children}</PortalAccessGate>;
}
