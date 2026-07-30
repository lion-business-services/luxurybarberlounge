import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyWebhooksLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/webhooks">{children}</OwnerOnlyGate>;
}
