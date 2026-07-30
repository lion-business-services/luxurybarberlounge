import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyPoliciesLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/policies">{children}</OwnerOnlyGate>;
}
