import { OwnerOnlyGate } from "@/components/admin/OwnerOnlyGate";

export default function OwnerOnlyStatementsLayout({ children }: { children: React.ReactNode }) {
  return <OwnerOnlyGate root="/admin/statements">{children}</OwnerOnlyGate>;
}
