import type { Metadata } from "next";
import { ClientModulePage } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "Inspiration", robots: { index: false, follow: false } };
export default function Page(){ return <ClientModulePage slug="grooming-profile"/>; }
