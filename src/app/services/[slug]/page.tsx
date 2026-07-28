import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findService, services } from "@/lib/content/site";
import { ServiceDetailView } from "./view";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = findService((await params).slug);
  if (!service) return {};
  return {
    title: service.name.en,
    description: service.blurb.en,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const service = findService((await params).slug);
  if (!service) notFound();
  return <ServiceDetailView service={service} />;
}
