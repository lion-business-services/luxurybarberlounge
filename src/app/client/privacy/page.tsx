import type { Metadata } from "next";
import { ClientPrivacyPanel } from "@/components/client/ClientPrivacyPanel";

export const metadata: Metadata = { title: "Privacy and Data Controls", robots: { index: false, follow: false } };

export default function Page() { return <ClientPrivacyPanel />; }
