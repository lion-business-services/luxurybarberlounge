import type { Metadata } from "next"; import { AdminBarbersPage } from "@/components/admin/AdminPages";
export const metadata: Metadata={title:"Barber Operations",robots:{index:false,follow:false}}; export default function Page(){return <AdminBarbersPage/>}
