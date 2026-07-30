import type { Metadata } from "next";
import { ClientQueuePage } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "My Queue", robots: { index: false, follow: false } };
export default function Page(){ return <ClientQueuePage/>; }
