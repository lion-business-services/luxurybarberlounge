import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyDataControlsLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/data-controls">{children}</OwnerOnlyGate>;
}
