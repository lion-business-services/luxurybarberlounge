import type { Metadata } from "next";
import { AdminPaymentTracking } from "@/components/admin/AdminPaymentTracking";

export const metadata: Metadata = { title: "Payment Tracking", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return <AdminPaymentTracking />;
}
