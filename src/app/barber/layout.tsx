export const dynamic = "force-dynamic";
export const revalidate = 0;

import { PortalAccessGate } from "@/components/portal/PortalAccessGate";

export default function BarberPortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalAccessGate root="/barber" allowed={["barber", "owner", "super_admin"]}>{children}</PortalAccessGate>;
}
