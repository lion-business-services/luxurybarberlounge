import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n/context";
import { Header } from "@/components/Header";
import { MagneticCursor, ScrollProgress } from "@/components/motion";
import { Footer } from "@/components/Footer";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Luxury Barber Lounge",
    template: "%s · Luxury Barber Lounge",
  },
  description:
    "An invitation-grade barbershop. Old-world craft, modern grooming, by appointment.",
  metadataBase: new URL("https://luxurybarberlounge.com"),
  openGraph: {
    title: "Luxury Barber Lounge",
    description:
      "Old-world craft. Modern grooming. A quiet room poured in brass and leather.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--color-ink)] text-[var(--color-bone)]">
        <LangProvider>
          <ScrollProgress />
          <MagneticCursor />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-[80] focus:rounded-full focus:bg-[var(--color-brass)] focus:px-5 focus:py-2 focus:text-[12px] focus:tracking-[0.2em] focus:uppercase focus:text-[var(--color-ink)]"
          >
            Skip to content
          </a>
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  );
}
