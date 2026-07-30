import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyIntegrationsLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/integrations">{children}</OwnerOnlyGate>;
}
