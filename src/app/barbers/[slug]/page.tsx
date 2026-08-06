import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { barbers, findBarber } from "@/lib/content/site";
import { BarberDetailView } from "./view";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return barbers.filter((barber) => barber.active).map((barber) => ({ slug: barber.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const barber = findBarber((await params).slug);
  if (!barber) return {};
  return { title: barber.name, description: barber.bio.en, alternates: { canonical: `/barbers/${barber.slug}` } };
}

export default async function BarberPage({ params }: Props) {
  const barber = findBarber((await params).slug);
  if (!barber) notFound();
  return <BarberDetailView barber={barber} />;
}
