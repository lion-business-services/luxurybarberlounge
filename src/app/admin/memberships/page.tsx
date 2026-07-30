import type { Metadata } from "next"; import { AdminMembershipsPage } from "@/components/admin/AdminPages";
export const metadata: Metadata={title:"Memberships",robots:{index:false,follow:false}}; export default function Page(){return <AdminMembershipsPage/>}
