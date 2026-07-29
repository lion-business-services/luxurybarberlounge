import { PortalAccessGate } from "@/components/portal/PortalAccessGate";

export default function ReceptionPortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalAccessGate root="/reception" allowed={["receptionist", "manager", "owner", "super_admin"]}>{children}</PortalAccessGate>;
}
