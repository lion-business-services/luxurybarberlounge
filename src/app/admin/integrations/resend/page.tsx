import type { Metadata } from "next"; import { AdminIntegrationsPage } from "@/components/admin/AdminPages";
export const metadata: Metadata={title:"Resend Integration",robots:{index:false,follow:false}}; export default function Page(){return <AdminIntegrationsPage provider="resend"/>}
