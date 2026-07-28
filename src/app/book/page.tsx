import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Choose a service and preferred barber or submit a reservation request for Luxury Barber Lounge in Northfield, New Jersey.",
};

export default function BookPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Reserve your chair", es: "Reserva tu silla" }}
        title={{ en: "Book Your Experience", es: "Reserva tu Experiencia" }}
        lead={{
          en: "Choose a service and preferred chair. Until live availability is activated, submit a reservation request and the lounge will confirm the time directly.",
          es: "Elige un servicio y tu silla preferida. Hasta activar la disponibilidad en vivo, envía una solicitud y el lounge confirmará la hora directamente.",
        }}
      />
      <main className="mx-auto max-w-7xl px-6 pb-28 sm:px-10">
        <Suspense fallback={<div className="h-96 animate-pulse border border-[var(--color-ink-line)] bg-[var(--color-ink-soft)]" />}>
          <BookingFlow />
        </Suspense>
      </main>
    </>
  );
}
