import type { Metadata } from "next"; import { CommissionWorkspace } from "@/components/commissions/CommissionWorkspace";
export const metadata: Metadata={title:"Calculated Amounts",robots:{index:false,follow:false}}; export default function Page(){return <CommissionWorkspace role="admin"/>}
