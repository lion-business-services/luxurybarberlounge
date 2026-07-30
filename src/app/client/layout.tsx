import { PortalAccessGate } from "@/components/portal/PortalAccessGate";
import { ClientShell } from "@/components/client/ClientShell";

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalAccessGate root="/client" allowed={["client", "owner", "super_admin"]}><ClientShell>{children}</ClientShell></PortalAccessGate>;
}
