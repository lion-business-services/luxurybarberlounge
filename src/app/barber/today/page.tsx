import type { Metadata } from "next";
import { BarberSectionLive } from "@/components/barber/BarberPortalLive";
export const metadata: Metadata = { title: "Barber Portal", robots: { index: false, follow: false } };
export default function Page() { return <BarberSectionLive slug="today" />; }
