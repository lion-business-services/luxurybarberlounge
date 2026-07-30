import type { Metadata } from "next";
import { ClientDashboard } from "@/components/client/ClientDashboard";
export const metadata: Metadata = { title: "Client Portal", robots: { index: false, follow: false } };
export default function Page(){ return <ClientDashboard/>; }
