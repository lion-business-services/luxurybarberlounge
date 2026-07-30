import type { Metadata } from "next";
import { ClientMembershipPage } from "@/components/client/ClientPages";
export const metadata: Metadata = { title: "My Membership", robots: { index: false, follow: false } };
export default function Page(){ return <ClientMembershipPage/>; }
