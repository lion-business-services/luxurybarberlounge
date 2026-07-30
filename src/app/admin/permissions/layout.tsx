import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyPermissionsLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/permissions">{children}</OwnerOnlyGate>;
}
