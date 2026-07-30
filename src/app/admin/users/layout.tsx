import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyUsersLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/users">{children}</OwnerOnlyGate>;
}
