import type { Metadata } from "next";
import { AdminAppointmentsWorkspace } from "@/components/admin/AdminAppointmentsWorkspace";
export const metadata: Metadata = { title: "Appointments", robots: { index: false, follow: false } };
export default function Page() { return <AdminAppointmentsWorkspace />; }
