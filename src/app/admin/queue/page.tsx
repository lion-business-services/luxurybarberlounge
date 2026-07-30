import type { Metadata } from "next"; import { QueueOperationsPanel } from "@/components/operations/QueueOperationsPanel";
export const metadata: Metadata={title:"Queue Operations",robots:{index:false,follow:false}}; export default function Page(){return <QueueOperationsPanel/>}
