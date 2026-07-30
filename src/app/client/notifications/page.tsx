import type { Metadata } from "next";
import { ClientModulePage } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };
export default function Page(){ return <ClientModulePage slug="notifications"/>; }
