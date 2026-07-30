import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyBusinessSettingsLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/business-settings">{children}</OwnerOnlyGate>;
}
