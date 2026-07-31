import type { Metadata } from "next";
import { AdminClientsPage } from "@/components/admin/AdminPages";

export const metadata: Metadata = { title: "Clients", robots: { index: false, follow: false } };

export default function Page() {
  return <AdminClientsPage />;
}
