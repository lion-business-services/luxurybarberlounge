import type { Metadata } from "next";
import { AdminAutomationsPage } from "@/components/admin/AdminPages";

export const metadata: Metadata = {
  title: "Automatic Messages",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminAutomationsPage />;
}
