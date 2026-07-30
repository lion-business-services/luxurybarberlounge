import type { Metadata } from "next"; import { AdminOrdersPage } from "@/components/admin/AdminPages";
export const metadata: Metadata={title:"Orders",robots:{index:false,follow:false}}; export default function Page(){return <AdminOrdersPage/>}
