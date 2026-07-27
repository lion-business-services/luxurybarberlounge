export type Lang = "en" | "es";

export const dict = {
  nav: {
    home: { en: "Home", es: "Inicio" },
    services: { en: "Services", es: "Servicios" },
    barbers: { en: "Barbers", es: "Barberos" },
    membership: { en: "Membership", es: "Membresía" },
    visit: { en: "Visit", es: "Visítanos" },
  },
  langToggle: {
    label: { en: "Language", es: "Idioma" },
    switchToEs: { en: "Cambiar a Español", es: "Cambiar a Español" },
    switchToEn: { en: "Switch to English", es: "Switch to English" },
  },
  hero: {
    eyebrow: {
      en: "Private Lounge · By Appointment",
      es: "Salón Privado · Por Cita",
    },
    title: { en: "Luxury Barber Lounge", es: "Luxury Barber Lounge" },
    tagline: {
      en: "Old-world craft. Modern grooming. A quiet room poured in brass and leather.",
      es: "Oficio clásico. Estilo moderno. Un salón íntimo en latón y cuero.",
    },
    intro: {
      en: "An invitation-grade barbershop built for the gentleman who values the cut as much as the chair he sits in. Single-seating service, a curated bar of tools, and barbers who treat the trade like a craft.",
      es: "Una barbería de nivel premium para el caballero que valora el corte tanto como el sillón donde se sienta. Atención uno a uno, herramientas curadas y barberos que tratan el oficio como un arte.",
    },
    cta: { en: "Reserve · Book Now", es: "Reservar · Agendar" },
    comingSoon: { en: "Opening Soon", es: "Próxima Apertura" },
  },
  stub: {
    badge: { en: "In Preparation", es: "En Preparación" },
    services: {
      title: { en: "Services", es: "Servicios" },
      body: {
        en: "The full menu — cuts, shaves, beard work, and member-only rituals — is being finalized.",
        es: "El menú completo — cortes, afeitados, barba y rituales exclusivos — está en preparación.",
      },
    },
    barbers: {
      title: { en: "The Barbers", es: "Los Barberos" },
      body: {
        en: "Meet the chairs. Profiles, specialties, and direct booking are arriving soon.",
        es: "Conoce a los barberos. Perfiles, especialidades y reservas directas llegan pronto.",
      },
    },
    membership: {
      title: { en: "Membership", es: "Membresía" },
      body: {
        en: "A small, private membership for gentlemen who prefer their grooming on standing reservation.",
        es: "Una membresía privada y limitada para caballeros que prefieren su cuidado con reserva permanente.",
      },
    },
    visit: {
      title: { en: "Visit", es: "Visítanos" },
      body: {
        en: "Address, hours, parking, and the quiet etiquette of the lounge — coming online with our opening.",
        es: "Dirección, horarios, estacionamiento y la etiqueta del salón — disponibles para nuestra apertura.",
      },
    },
    about: {
      title: { en: "About", es: "Nosotros" },
      body: {
        en: "The story behind the lounge, the standards we hold, and the men who keep them.",
        es: "La historia detrás del salón, los estándares que mantenemos y los hombres que los sostienen.",
      },
    },
  },
  footer: {
    sectionVisit: { en: "Visit", es: "Visítanos" },
    sectionHours: { en: "Hours", es: "Horario" },
    sectionFollow: { en: "Follow", es: "Síguenos" },
    addressPlaceholder: {
      en: "Address — to be announced",
      es: "Dirección — por anunciar",
    },
    phonePlaceholder: { en: "Phone — TBA", es: "Teléfono — por anunciar" },
    hoursWeekday: {
      en: "Tuesday – Friday · 10:00 – 19:00",
      es: "Martes – Viernes · 10:00 – 19:00",
    },
    hoursSat: { en: "Saturday · 09:00 – 18:00", es: "Sábado · 09:00 – 18:00" },
    hoursSunMon: {
      en: "Sunday & Monday · Closed",
      es: "Domingo y Lunes · Cerrado",
    },
    rights: {
      en: "All rights reserved.",
      es: "Todos los derechos reservados.",
    },
    tagline: {
      en: "By appointment. Quiet hours observed.",
      es: "Sólo con cita. Se respeta el silencio del salón.",
    },
  },
} as const;

type Leaf = { en: string; es: string };
type Node = { [k: string]: Leaf | Node };

export function t(node: Leaf | Node, lang: Lang): string {
  if ("en" in node && "es" in node) return (node as Leaf)[lang];
  throw new Error("t() called on a non-leaf dict node");
}
