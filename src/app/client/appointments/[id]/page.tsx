import type { Metadata } from "next";
import { ClientAppointmentDetail } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "Appointment Details", robots: { index: false, follow: false } };
export default async function Page({ params }:{params:Promise<{id:string}>}){ const {id}=await params; return <ClientAppointmentDetail id={id}/>; }
