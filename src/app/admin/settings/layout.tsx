import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlySettingsLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/settings">{children}</OwnerOnlyGate>;
}
