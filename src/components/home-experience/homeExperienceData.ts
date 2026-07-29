import type { Lang } from "@/lib/content/site";

export const homeMedia = {
  thresholdPoster: "/media/home/video/lounge-entry-poster.webp",
  thresholdMp4: "/media/home/video/lounge-entry.mp4",
  thresholdWebm: "/media/home/video/lounge-entry.webm",
  thresholdMobilePoster: "/media/home/video/lounge-entry-mobile-poster.webp",
  thresholdMobileMp4: "/media/home/video/lounge-entry-mobile.mp4",
  toolsTray: "/media/home/tools/tools-tray.webp",
  toolsStand: "/media/home/tools/tools-stand.webp",
  toolsPair: "/media/home/tools/tools-pair.webp",
  toolsOrnate: "/media/home/tools/tools-ornate.webp",
  loungeGold: "/media/home/interiors/lounge-gold.webp",
  loungeEditorial: "/media/home/interiors/lounge-editorial.webp",
  stationsRound: "/media/home/interiors/stations-round.webp",
  stationsArched: "/media/home/interiors/stations-arched.webp",
  officialLogo: "/brand/logo-official-transparent.webp",
} as const;

export const processSteps = {
  en: [
    ["01", "Consultation", "We begin with your features, routine, preferences, and the finish you want to maintain."],
    ["02", "Preparation", "The service is set with the right timing, tools, and details before the first cut is made."],
    ["03", "Precision", "Shape, weight, transitions, and edges are controlled deliberately, never rushed."],
    ["04", "Refinement", "Every angle is checked, balanced, and finished for how the style will live beyond the chair."],
    ["05", "Final reveal", "You leave with a polished result and practical guidance for keeping it intentional."],
  ],
  es: [
    ["01", "Consulta", "Comenzamos con tus facciones, rutina, preferencias y el acabado que deseas mantener."],
    ["02", "Preparación", "El servicio se organiza con el tiempo, las herramientas y los detalles correctos antes del primer corte."],
    ["03", "Precisión", "La forma, el peso, las transiciones y los bordes se controlan deliberadamente, sin prisa."],
    ["04", "Refinamiento", "Cada ángulo se revisa, equilibra y termina pensando en cómo vivirá el estilo fuera de la silla."],
    ["05", "Revelación final", "Sales con un resultado pulido y orientación práctica para mantenerlo intencional."],
  ],
} as const satisfies Record<Lang, readonly (readonly [string, string, string])[]>;

export const experienceCopy = {
  threshold: {
    eyebrow: { en: "Beyond the cut", es: "Más allá del corte" },
    title: { en: "Step into distinction.", es: "Entra en la distinción." },
    body: {
      en: "A private standard of grooming where precision, atmosphere, and personal attention move as one.",
      es: "Un estándar privado de grooming donde precisión, ambiente y atención personal se mueven como uno solo.",
    },
  },
  membership: {
    eyebrow: { en: "Membership by design", es: "Membresía por diseño" },
    title: { en: "A reserved rhythm, shaped around you.", es: "Un ritmo reservado, diseñado para ti." },
    body: {
      en: "Explore editable membership concepts for guests who prefer consistency, priority, and a more considered grooming routine. Final terms remain subject to owner approval.",
      es: "Explora conceptos editables para clientes que prefieren consistencia, prioridad y una rutina de grooming más cuidada. Los términos finales requieren aprobación del propietario.",
    },
  },
  precision: {
    eyebrow: { en: "The art of precision", es: "El arte de la precisión" },
    title: { en: "Every detail begins with understanding.", es: "Cada detalle comienza con comprensión." },
    body: {
      en: "Your service is shaped around your features, lifestyle, texture, and the standard you expect when you leave the chair.",
      es: "Tu servicio se diseña según tus facciones, estilo de vida, textura y el estándar que esperas al dejar la silla.",
    },
  },
  services: {
    eyebrow: { en: "Signature services", es: "Servicios signature" },
    title: { en: "Choose the result. We refine the ritual.", es: "Elige el resultado. Nosotros refinamos el ritual." },
  },
  lounge: {
    eyebrow: { en: "The lounge", es: "El lounge" },
    title: { en: "Designed to slow the world down.", es: "Diseñado para bajar el ritmo del mundo." },
    body: {
      en: "Refined surroundings, considered comfort, and a professional room built around focused service.",
      es: "Un entorno refinado, comodidad cuidada y un espacio profesional creado alrededor de un servicio enfocado.",
    },
  },
  barbers: {
    eyebrow: { en: "Meet the artists", es: "Conoce a los artistas" },
    title: { en: "Nine distinct chairs. One exacting standard.", es: "Nueve sillas distintas. Un estándar exigente." },
    body: {
      en: "Explore the team, their preferred work, and the chair that best fits your service.",
      es: "Explora el equipo, su trabajo preferido y la silla que mejor se adapta a tu servicio.",
    },
  },
  transformation: {
    eyebrow: { en: "The transformation", es: "La transformación" },
    title: { en: "Precision changes more than the reflection.", es: "La precisión cambia más que el reflejo." },
    body: {
      en: "Move the mirror to discover how consultation becomes a tailored, confident finish. This is a conceptual service journey, not a customer before-and-after.",
      es: "Mueve el espejo para descubrir cómo la consulta se convierte en un acabado personalizado y seguro. Es un recorrido conceptual, no un antes y después de un cliente.",
    },
  },
  visit: {
    eyebrow: { en: "Visit the lounge", es: "Visita el lounge" },
    title: { en: "Northfield. Your next chair is ready.", es: "Northfield. Tu próxima silla está lista." },
  },
  final: {
    eyebrow: { en: "Your experience", es: "Tu experiencia" },
    title: { en: "Make the chair yours.", es: "Haz tuya la silla." },
    body: {
      en: "Choose your service, select your barber, and reserve a moment designed entirely around you.",
      es: "Elige tu servicio, selecciona tu barbero y reserva un momento diseñado completamente para ti.",
    },
  },
} as const;
