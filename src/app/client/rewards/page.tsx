import type { Metadata } from "next";
import { ClientModulePage } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "Rewards", robots: { index: false, follow: false } };
export default function Page(){ return <ClientModulePage slug="rewards"/>; }
