import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlySyncHealthLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/sync-health">{children}</OwnerOnlyGate>;
}
