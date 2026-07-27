import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n/context";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MagneticCursor } from "@/components/MagneticCursor";
import { MobileActions } from "@/components/MobileActions";

const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400","500","600","700"], style: ["normal","italic"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["300","400","500","600"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Luxury Barber Lounge", template: "%s · Luxury Barber Lounge" },
  description: "An invitation-grade barbershop. Old-world craft, modern grooming, by appointment.",
  metadataBase: new URL("https://luxurybarberlounge.com"),
  openGraph: { title: "Luxury Barber Lounge", description: "Old-world craft. Modern grooming. A quiet room poured in brass and leather.", type: "website", images: ["/brand/luxury-barber-logo.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${playfair.variable} ${inter.variable} h-full antialiased`}><body className="flex min-h-full flex-col bg-[var(--color-ink)] text-[var(--color-bone)]"><LangProvider><MagneticCursor/><Header/><main className="flex-1">{children}</main><Footer/><MobileActions/></LangProvider></body></html>;
}
