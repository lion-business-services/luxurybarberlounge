import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlySystemHealthLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/system-health">{children}</OwnerOnlyGate>;
}
