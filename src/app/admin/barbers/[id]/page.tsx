import type { Metadata } from "next"; import { AdminBarberDetail } from "@/components/admin/AdminPages";
export const metadata: Metadata={title:"Barber Record",robots:{index:false,follow:false}}; export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdminBarberDetail id={id}/>}
