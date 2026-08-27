export const dynamic = "force-dynamic";
export const revalidate = 0;

import { PortalAccessGate } from "@/components/portal/PortalAccessGate";

const simplifiedBarberNavigation = `
  .barber-portal-shell .portal-role-nav a[href="/barber/queue"],
  .barber-portal-shell .portal-role-nav a[href="/barber/clients"],
  .barber-portal-shell .portal-role-nav a[href="/barber/attribution"],
  .barber-portal-shell .portal-role-nav a[href="/barber/portfolio"],
  .barber-portal-shell .portal-role-nav a[href="/barber/performance"],
  .barber-portal-shell .portal-role-nav a[href="/barber/revenue"],
  .barber-portal-shell .portal-role-nav a[href="/barber/disputes"],
  .barber-portal-shell .portal-role-nav a[href="/barber/notifications"],
  .barber-portal-shell .portal-role-nav a[href="/barber/resources"] {
    display: none !important;
  }
`;

export default function BarberPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAccessGate root="/barber" allowed={["barber", "owner", "super_admin"]}>
      <style>{simplifiedBarberNavigation}</style>
      {children}
    </PortalAccessGate>
  );
}
