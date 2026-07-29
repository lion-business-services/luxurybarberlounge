import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n/context";
import { Header } from "@/components/Header";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { Footer } from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { business } from "@/lib/content/site";
import { GlobalClientWidgets } from "@/components/GlobalClientWidgets";
import { AdaptiveMotionProvider } from "@/lib/motion/useAdaptiveMotionTier";

export const metadata: Metadata = {
  title: {
    default: "Luxury Barber Lounge | Northfield, NJ",
    template: "%s · Luxury Barber Lounge",
  },
  description: business.shortDescription.en,
  metadataBase: new URL(business.domain),
  applicationName: business.name,
  keywords: ["barbershop Northfield NJ", "luxury barber", "fade Northfield", "beard trim Northfield", "hot towel shave Atlantic County"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Luxury Barber Lounge",
    description: business.tagline.en,
    type: "website",
    url: business.domain,
    siteName: business.name,
    locale: "en_US",
    alternateLocale: ["es_US"],
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Luxury Barber Lounge" }],
  },
  twitter: { card: "summary_large_image", title: business.name, description: business.tagline.en, images: ["/opengraph-image.png"] },
  icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: business.name,
    url: business.domain,
    telephone: business.phone,
    email: business.email,
    image: `${business.domain}/opengraph-image.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.street,
      addressLocality: business.city,
      addressRegion: business.state,
      postalCode: business.postalCode,
      addressCountry: business.country,
    },
    priceRange: "$$",
    sameAs: [business.instagram, business.facebook],
  };

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- The App Router root layout owns the global font stylesheet. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--color-ink)] text-[var(--color-bone)]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <LangProvider>
          <AdaptiveMotionProvider>
            <SmoothScroll>
            <ScrollProgress />
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-[80] focus:rounded-full focus:bg-[var(--color-brass)] focus:px-5 focus:py-2 focus:text-[12px] focus:tracking-[0.2em] focus:uppercase focus:text-[var(--color-ink)]"
            >
              Skip to content
            </a>
            <Header />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
            <GlobalClientWidgets />
            </SmoothScroll>
          </AdaptiveMotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
