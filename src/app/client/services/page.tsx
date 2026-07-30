import type { Metadata } from "next";
import { ClientServicesPage } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "Services", robots: { index: false, follow: false } };
export default function Page(){ return <ClientServicesPage/>; }
