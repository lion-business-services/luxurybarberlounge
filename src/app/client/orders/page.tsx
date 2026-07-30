import type { Metadata } from "next";
import { ClientOrdersPage } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "My Orders", robots: { index: false, follow: false } };
export default function Page(){ return <ClientOrdersPage/>; }
