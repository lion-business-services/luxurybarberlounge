export type Lang = "en" | "es";

export const dict = {
  nav: {
    home: { en: "Home", es: "Inicio" },
    services: { en: "Services", es: "Servicios" },
    barbers: { en: "Barbers", es: "Barberos" },
    membership: { en: "Membership", es: "Membresía" },
    gallery: { en: "Gallery", es: "Galería" },
    visit: { en: "Visit", es: "Visítanos" },
    book: { en: "Book", es: "Reservar" },
    portal: { en: "Client portal", es: "Portal del cliente" },
  },
  langToggle: {
    label: { en: "Language", es: "Idioma" },
    switchToEs: { en: "Cambiar a Español", es: "Cambiar a Español" },
    switchToEn: { en: "Switch to English", es: "Switch to English" },
  },
  hero: {
    eyebrow: {
      en: "Northfield · Precision Grooming",
      es: "Northfield · Grooming de Precisión",
    },
    title: { en: "Luxury Barber Lounge", es: "Luxury Barber Lounge" },
    tagline: {
      en: "Old-world craft. Modern grooming. A first-class room built around the chair.",
      es: "Oficio clásico. Grooming moderno. Un salón de primera clase creado alrededor de la silla.",
    },
    intro: {
      en: "Precision cuts, beard architecture, hot-towel rituals, and a calm lounge experience designed around how you want to look and feel.",
      es: "Cortes de precisión, diseño de barba, rituales de toalla caliente y una experiencia tranquila diseñada para cómo deseas verte y sentirte.",
    },
    cta: { en: "Reserve · Book Now", es: "Reservar · Agendar" },
    comingSoon: { en: "Grand Opening · August 4 · 5 PM", es: "Gran Apertura · 4 de agosto · 5 PM" },
  },
  stub: {
    badge: { en: "In Preparation", es: "En Preparación" },
    services: { title: { en: "Services", es: "Servicios" }, body: { en: "Explore the complete grooming menu.", es: "Explora el menú completo de grooming." } },
    barbers: { title: { en: "The Barbers", es: "Los Barberos" }, body: { en: "Meet the professionals behind each chair.", es: "Conoce a los profesionales detrás de cada silla." } },
    membership: { title: { en: "Membership", es: "Membresía" }, body: { en: "Build a reliable grooming rhythm with priority benefits.", es: "Crea un ritmo constante de grooming con beneficios prioritarios." } },
    visit: { title: { en: "Visit", es: "Visítanos" }, body: { en: "Find the lounge, hours, parking, and contact details.", es: "Encuentra el salón, horario, estacionamiento y contacto." } },
    about: { title: { en: "About", es: "Nosotros" }, body: { en: "The standards, room, and service behind the lounge.", es: "Los estándares, el espacio y el servicio detrás del salón." } },
  },
  footer: {
    sectionVisit: { en: "Visit", es: "Visítanos" },
    sectionHours: { en: "Hours", es: "Horario" },
    sectionExplore: { en: "Explore", es: "Explora" },
    sectionFollow: { en: "Follow", es: "Síguenos" },
    rights: { en: "All rights reserved.", es: "Todos los derechos reservados." },
    tagline: {
      en: "Precision grooming, genuine hospitality, and a chair worth returning to.",
      es: "Grooming de precisión, hospitalidad genuina y una silla a la que vale la pena volver.",
    },
  },
} as const;

type Leaf = { en: string; es: string };
type Node = { [k: string]: Leaf | Node };

export function t(node: Leaf | Node, lang: Lang): string {
  if ("en" in node && "es" in node) return (node as Leaf)[lang];
  throw new Error("t() called on a non-leaf dict node");
}
