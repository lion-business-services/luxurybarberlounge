import type { Metadata } from "next"; import { AdminModulePage } from "@/components/admin/AdminPages";
export const metadata: Metadata={title:"Permissions",robots:{index:false,follow:false}}; export default function Page(){return <AdminModulePage slug="roles"/>}
