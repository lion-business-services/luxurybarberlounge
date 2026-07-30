import type { Metadata } from "next"; import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
export const metadata: Metadata={title:"Users and Invitations",robots:{index:false,follow:false}}; export default function Page(){return <AdminUsersPanel/>}
