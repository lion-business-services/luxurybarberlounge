import type { Barber, Lang } from "@/lib/content/site";

const losWeekdays = [0, 5, 6];

const losAvailability = {
  en: "Friday 6:00 PM–9:00 PM · Saturday 6:00 PM–9:00 PM · Sunday 12:00 PM–4:00 PM",
  es: "Viernes 6:00 PM–9:00 PM · Sábado 6:00 PM–9:00 PM · Domingo 12:00 PM–4:00 PM",
};

const losWorkingDays = {
  en: "Friday, Saturday, and Sunday",
  es: "Viernes, sábado y domingo",
};

const losBio = {
  en: "Signature Los has been mastering the art of barbering since 1997.",
  es: "Signature Los domina el arte de la barbería desde 1997.",
};

const losStory = {
  en: "Signature Los has been mastering the art of barbering since 1997. Originally from Brooklyn, raised in Puerto Rico, and now based in New Jersey, he has earned over 100 industry awards, owned two barbershops, appeared in magazines and television, and built a reputation as an industry barber. His celebrity clientele includes Sean Kingston, Earth, Wind & Fire, and producers for Michael Jackson, Drake, Ne-Yo, and Chris Brown. With nearly three decades of experience, Signature Los brings precision, creativity, and excellence to every client.",
  es: "Signature Los domina el arte de la barbería desde 1997. Originario de Brooklyn, criado en Puerto Rico y ahora radicado en Nueva Jersey, ha recibido más de 100 premios de la industria, ha sido propietario de dos barberías, ha aparecido en revistas y televisión y ha construido una reputación como barbero de la industria. Su clientela de celebridades incluye a Sean Kingston, Earth, Wind & Fire y productores de Michael Jackson, Drake, Ne-Yo y Chris Brown. Con casi tres décadas de experiencia, Signature Los aporta precisión, creatividad y excelencia a cada cliente.",
};

const losTitle = {
  en: "Master Barber & Educator",
  es: "Maestro Barbero y Educador",
};

const losSpecialties = {
  en: "Master barbering · Precision haircuts · Custom designs · Barber education",
  es: "Barbería maestra · Cortes de precisión · Diseños personalizados · Educación de barbería",
};

export function withLiveBarberOverrides(barber: Barber): Barber {
  if (barber.slug !== "barber-los") return barber;
  return {
    ...barber,
    name: "Signature Los",
    initials: "SL",
    title: losTitle,
    bio: losBio,
    story: losStory,
    specialties: losSpecialties,
    specialtyTags: ["master barbering", "precision haircuts", "custom designs", "barber education"],
    availability: losAvailability,
    workingDays: losWorkingDays,
    bookingWeekdays: [...losWeekdays],
    image: {
      ...barber.image,
      alt: {
        en: "Signature Los of Luxury Barber Lounge",
        es: "Signature Los de Luxury Barber Lounge",
      },
    },
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
