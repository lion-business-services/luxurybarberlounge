import type { Metadata } from "next";
import { ClientBarbersPage } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "Barbers", robots: { index: false, follow: false } };
export default function Page(){ return <ClientBarbersPage/>; }
