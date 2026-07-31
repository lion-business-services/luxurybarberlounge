import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = { title: "Shop Operations", robots: { index: false, follow: false } };

export default function Page() {
  return <AdminDashboard />;
}
