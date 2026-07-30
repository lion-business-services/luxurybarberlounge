import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyAuditLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/audit">{children}</OwnerOnlyGate>;
}
