import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyAuditLogsLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/audit-logs">{children}</OwnerOnlyGate>;
}
