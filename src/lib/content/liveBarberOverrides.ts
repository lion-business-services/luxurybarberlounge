import type { Barber, Lang } from "@/lib/content/site";

const losWeekdays = [0, 2, 3, 4, 5, 6];

const losAvailability = {
  en: "Available every open lounge day: Sunday 9:00 AM–4:00 PM and Tuesday through Saturday 8:00 AM–9:00 PM.",
  es: "Disponible todos los días que abre el lounge: domingo de 9:00 AM a 4:00 PM y martes a sábado de 8:00 AM a 9:00 PM.",
};

const losWorkingDays = {
  en: "Sunday and Tuesday through Saturday",
  es: "Domingo y martes a sábado",
};

const losStory = {
  en: "Barber Lo's is a bilingual barber offering all types of haircuts and custom design services, available throughout normal lounge operating hours.",
  es: "Barber Lo's es un barbero bilingüe que ofrece todo tipo de cortes y diseños personalizados, disponible durante el horario normal del lounge.",
};

export function withLiveBarberOverrides(barber: Barber): Barber {
  if (barber.slug !== "barber-los") return barber;
  return {
    ...barber,
    story: losStory,
    availability: losAvailability,
    workingDays: losWorkingDays,
    bookingWeekdays: [...losWeekdays],
    walkIns: true,
  };
}

export function applyLiveBarberOverrides(roster: Barber[]) {
  const index = roster.findIndex((barber) => barber.slug === "barber-los");
  if (index < 0) return roster;
  roster[index] = withLiveBarberOverrides(roster[index]);
  return roster;
}

export function walkInFaqAnswer(lang: Lang) {
  return lang === "es"
    ? "Sí. Se aceptan walk-ins durante el horario abierto, sujeto a capacidad en tiempo real."
    : "Yes. Walk-ins are accepted during open business hours, subject to real-time capacity.";
}
