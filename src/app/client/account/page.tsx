import type { Metadata } from "next";
import { ClientAccountPage } from "@/components/client/ClientPages";

export const metadata: Metadata = { title: "My Account", robots: { index: false, follow: false } };

export default function Page() {
  return <ClientAccountPage />;
}
