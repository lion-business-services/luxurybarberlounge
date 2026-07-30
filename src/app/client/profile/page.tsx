import type { Metadata } from "next";
import { ClientProfilePage } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "My Profile", robots: { index: false, follow: false } };
export default function Page(){ return <ClientProfilePage/>; }
