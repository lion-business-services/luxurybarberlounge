import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyCommissionsLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/commissions">{children}</OwnerOnlyGate>;
}
