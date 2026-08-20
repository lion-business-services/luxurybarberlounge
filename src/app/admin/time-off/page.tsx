import type { Metadata } from "next";
import { AdminTimeOffWorkspace } from "@/components/admin/AdminTimeOffWorkspace";

export const metadata: Metadata = { title: "Barber availability", robots: { index: false, follow: false } };

export default function Page() {
  return <AdminTimeOffWorkspace />;
}
