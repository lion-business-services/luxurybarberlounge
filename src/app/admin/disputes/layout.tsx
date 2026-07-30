import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyDisputesLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/disputes">{children}</OwnerOnlyGate>;
}
