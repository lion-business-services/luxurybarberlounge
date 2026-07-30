import type { Metadata } from "next"; import { AdminModulePage } from "@/components/admin/AdminPages";
export const metadata: Metadata={title:"Add Ons",robots:{index:false,follow:false}}; export default function Page(){return <AdminModulePage slug="services"/>}
