import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyReconciliationLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/reconciliation">{children}</OwnerOnlyGate>;
}
