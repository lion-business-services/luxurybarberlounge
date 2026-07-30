import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyFeatureFlagsLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/feature-flags">{children}</OwnerOnlyGate>;
}
