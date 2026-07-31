import type { Metadata } from "next";
import { AdminSettingsHub } from "@/components/admin/AdminPages";

export const metadata: Metadata = { title: "Shop Settings", robots: { index: false, follow: false } };

export default function Page() {
  return <AdminSettingsHub />;
}
