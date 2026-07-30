import type { Metadata } from "next"; import { AdminAttributionPanel } from "@/components/attribution/AdminAttributionPanel";
export const metadata: Metadata={title:"Attribution",robots:{index:false,follow:false}}; export default function Page(){return <AdminAttributionPanel/>}
