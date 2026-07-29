import type { Metadata } from "next";
import { BarberPolicyPanel } from "@/components/barber/BarberPolicyPanel";

export const metadata: Metadata = { title: "Policies and Resources", robots: { index: false, follow: false } };

export default function Page() { return <BarberPolicyPanel />; }
