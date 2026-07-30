import { PortalAccessGate } from "@/components/portal/PortalAccessGate";

export function OwnerOnlyGate({ children, root }: { children: React.ReactNode; root: string }) {
  return <PortalAccessGate root={root} allowed={["owner", "super_admin"]}>{children}</PortalAccessGate>;
}
