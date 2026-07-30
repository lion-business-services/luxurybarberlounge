import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlySecurityLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/security">{children}</OwnerOnlyGate>;
}
