/**
 * Post-hero homepage experience — media registry and bilingual copy.
 * All imagery is client-supplied; signage that did not belong to the brand
 * was cropped or blurred at the asset-pipeline level, not hidden in CSS.
 */

export type Bi = { en: string; es: string };

const m = (base: string) => ({ desktop: `${base}.webp`, mobile: `${base}-m.webp` });

export const homeMedia = {
  video: {
    src: "/media/home/video/interior.mp4",
    poster: "/media/home/posters/interior.webp",
  },
  interiors: {
    archMirror: m("/media/home/interiors/arch-mirror"),
    goldAccents: m("/media/home/interiors/gold-accents"),
    stationsA: m("/media/home/interiors/stations-a"),
    stationsB: m("/media/home/interiors/stations-b"),
  },
  tools: {
    displayBox: m("/media/home/tools/display-box"),
    duoStand: m("/media/home/tools/duo-stand"),
    caddy: m("/media/home/tools/caddy"),
    lionStand: m("/media/home/tools/lion-stand"),
  },
  brand: { cards: m("/media/home/brand/cards") },
  atmosphere: { decanter: m("/media/home/atmosphere/decanter") },
} as const;

export const experienceCopy = {
  threshold: {
    kicker: { en: "Beyond the cut", es: "Más allá del corte" },
    title: { en: "Step into distinction.", es: "Entra a la distinción." },
    body: {
      en: "A private standard of grooming — unhurried, exact, and built around you.",
      es: "Un estándar privado de arreglo personal: sin prisa, exacto y hecho a tu medida.",
    },
  },
  precision: {
    kicker: { en: "The art of precision", es: "El arte de la precisión" },
    title: { en: "Precision is not a finish. It is the standard.", es: "La precisión no es un acabado. Es el estándar." },
    stages: [
      { t: { en: "Consultation", es: "Consulta" }, d: { en: "Every detail begins with understanding — your features, routine, and how you wear your hair.", es: "Cada detalle comienza con entender: tus rasgos, tu rutina y cómo llevas tu cabello." } },
      { t: { en: "Preparation", es: "Preparación" }, d: { en: "Hot towels, clean tools, and a chair that is yours for the hour.", es: "Toallas calientes, herramientas limpias y una silla que es tuya por la hora." } },
      { t: { en: "Precision", es: "Precisión" }, d: { en: "Measured by eye, blended by hand, edged with a straight razor.", es: "Medido a ojo, difuminado a mano, perfilado con navaja." } },
      { t: { en: "Refinement", es: "Refinamiento" }, d: { en: "The last five minutes matter as much as the first forty.", es: "Los últimos cinco minutos importan tanto como los primeros cuarenta." } },
    ],
  },
  lounge: {
    kicker: { en: "The lounge", es: "El salón" },
    title: { en: "A room built for the ritual.", es: "Un espacio hecho para el ritual." },
    body: {
      en: "Low light, warm brass, marble underfoot — an atmosphere designed so the hour feels like yours.",
      es: "Luz baja, latón cálido, mármol bajo los pies: un ambiente diseñado para que la hora se sienta tuya.",
    },
  },
  signature: {
    kicker: { en: "The brand signature", es: "La firma de la casa" },
    title: { en: "Carried in the details.", es: "Presente en los detalles." },
    body: {
      en: "From the crest on the door to the card in your pocket — one standard, everywhere you touch it.",
      es: "Del escudo en la puerta a la tarjeta en tu bolsillo: un solo estándar en todo lo que tocas.",
    },
  },
  membership: {
    kicker: { en: "Membership, by design", es: "Membresía, por diseño" },
    title: { en: "A standing chair. A kept rhythm.", es: "Una silla apartada. Un ritmo constante." },
    body: {
      en: "Priority booking, planned maintenance, and benefits reserved for the regulars of the room.",
      es: "Reserva prioritaria, mantenimiento planificado y beneficios reservados para los clientes de casa.",
    },
    cta: { en: "Explore membership", es: "Conoce la membresía" },
  },
  final: {
    kicker: { en: "Your next visit", es: "Tu próxima visita" },
    title: { en: "Make the chair yours.", es: "Haz tuya la silla." },
    body: {
      en: "Choose a service, a preferred barber, or the first available chair. The lounge confirms the time, the details, and any deposit.",
      es: "Elige un servicio, tu barbero preferido o la primera silla disponible. El salón confirma la hora, los detalles y cualquier depósito.",
    },
    book: { en: "Book an appointment", es: "Reserva una cita" },
    queue: { en: "Join walk-in queue", es: "Únete a la fila" },
  },
  visit: {
    kicker: { en: "Visit the lounge", es: "Visita el salón" },
    title: { en: "Suite 106A, off Tilton Road.", es: "Suite 106A, sobre Tilton Road." },
    body: { en: "Park at the door and walk straight in.", es: "Estaciónate en la puerta y entra directo." },
    call: { en: "Call the lounge", es: "Llama al salón" },
    directions: { en: "Get directions", es: "Cómo llegar" },
    book: { en: "Book your experience", es: "Reserva tu experiencia" },
    walkins: { en: "Walk-in information", es: "Información sin cita" },
  },
} as const;
