import type { Metadata } from "next"; import { AdminClientDetail } from "@/components/admin/AdminPages";
export const metadata: Metadata={title:"Client Record",robots:{index:false,follow:false}}; export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdminClientDetail id={id}/>}
