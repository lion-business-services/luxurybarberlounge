import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyAiSettingsLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/ai-settings">{children}</OwnerOnlyGate>;
}
