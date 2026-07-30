import type { Metadata } from "next";
import { ClientAppointmentsPage } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "My Appointments", robots: { index: false, follow: false } };
export default function Page(){ return <ClientAppointmentsPage/>; }
