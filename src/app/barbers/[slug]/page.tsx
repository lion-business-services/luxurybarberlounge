import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { barbers, business, findBarber } from "@/lib/content/site";
import { BarberDetailView } from "./view";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return barbers.filter((barber) => barber.active).map((barber) => ({ slug: barber.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const barber = findBarber((await params).slug);
  if (!barber) return {};
  return {
    title: barber.name,
    description: barber.bio.en,
    alternates: { canonical: `/barbers/${barber.slug}` },
    openGraph: {
      title: `${barber.name} | ${business.name}`,
      description: barber.bio.en,
      url: `${business.domain}/barbers/${barber.slug}`,
      images: [{ url: `${business.domain}${barber.image.profile}`, alt: barber.image.alt.en }],
    },
  };
}

export default async function BarberPage({ params }: Props) {
  const barber = findBarber((await params).slug);
  if (!barber) notFound();
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: barber.name,
    jobTitle: barber.title.en,
    description: barber.bio.en,
    image: `${business.domain}${barber.image.profile}`,
    url: `${business.domain}/barbers/${barber.slug}`,
    worksFor: {
      "@type": "BarberShop",
      name: business.name,
      url: business.domain,
      telephone: business.phone,
    },
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} /><BarberDetailView barber={barber} /></>;
}
