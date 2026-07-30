import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyRolesLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/roles">{children}</OwnerOnlyGate>;
}
