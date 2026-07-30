import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyAttributionLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/attribution">{children}</OwnerOnlyGate>;
}
