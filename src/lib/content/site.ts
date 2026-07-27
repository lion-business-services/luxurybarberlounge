/**
 * Single source of truth for editable business content.
 *
 * Everything a non-developer will want to change lives here, in the same
 * `{ en, es }` shape the existing dictionary uses. Values marked CONFIRM are
 * placeholders awaiting the owner's intake form and must be replaced before
 * launch — they are deliberately generic so nothing reads as broken in public.
 */

export type Bi = { en: string; es: string };

export const business = {
  name: "Luxury Barber Lounge",
  street: "801 Tilton Rd, Suite 106",
  city: "Northfield, NJ 08225",
  county: "Atlantic County",
  /** CONFIRM — from owner intake. */
  phone: "(609) 000-0000",
  phoneHref: "tel:+16090000000",
  email: "hello@luxurybarberlounge.com",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=801+Tilton+Rd+Suite+106+Northfield+NJ+08225",
  instagram: "#",
  facebook: "#",
} as const;

/** CONFIRM — hours pending owner intake. `closed` days render as Closed. */
export const hours: { day: Bi; open: string; close: string; closed?: boolean }[] = [
  { day: { en: "Tuesday", es: "Martes" }, open: "9:00", close: "19:00" },
  { day: { en: "Wednesday", es: "Miércoles" }, open: "9:00", close: "19:00" },
  { day: { en: "Thursday", es: "Jueves" }, open: "9:00", close: "20:00" },
  { day: { en: "Friday", es: "Viernes" }, open: "9:00", close: "20:00" },
  { day: { en: "Saturday", es: "Sábado" }, open: "8:00", close: "18:00" },
  { day: { en: "Sunday", es: "Domingo" }, open: "", close: "", closed: true },
  { day: { en: "Monday", es: "Lunes" }, open: "", close: "", closed: true },
];

export type Service = {
  slug: string;
  name: Bi;
  blurb: Bi;
  minutes: number;
  /** CONFIRM — pricing pending owner intake. Displayed as "from $X". */
  from: number;
};

export const services: Service[] = [
  {
    slug: "signature-cut",
    name: { en: "Signature Cut", es: "Corte Signature" },
    blurb: {
      en: "Consultation, precision cut, hot towel, and a finish built to hold all week.",
      es: "Consulta, corte de precisión, toalla caliente y acabado que dura toda la semana.",
    },
    minutes: 45,
    from: 45,
  },
  {
    slug: "skin-fade",
    name: { en: "Skin Fade", es: "Skin Fade" },
    blurb: {
      en: "Clean taper to the skin, blended by eye, edged with a straight razor.",
      es: "Degradado limpio hasta la piel, difuminado a ojo y perfilado con navaja.",
    },
    minutes: 45,
    from: 45,
  },
  {
    slug: "beard-sculpt",
    name: { en: "Beard Sculpt", es: "Perfilado de Barba" },
    blurb: {
      en: "Shaped to your jaw, softened with steam, finished with oil.",
      es: "Diseñada a tu mandíbula, suavizada con vapor y terminada con aceite.",
    },
    minutes: 30,
    from: 30,
  },
  {
    slug: "cut-and-beard",
    name: { en: "Cut & Beard", es: "Corte y Barba" },
    blurb: {
      en: "The full sitting. Cut, beard, hot towel, and the chair for an hour.",
      es: "La sesión completa. Corte, barba, toalla caliente y la silla por una hora.",
    },
    minutes: 60,
    from: 70,
  },
  {
    slug: "hot-towel-shave",
    name: { en: "Hot Towel Shave", es: "Afeitado con Toalla Caliente" },
    blurb: {
      en: "Straight razor, three towels, and no reason to hurry.",
      es: "Navaja, tres toallas y ninguna razón para apurarse.",
    },
    minutes: 45,
    from: 50,
  },
  {
    slug: "young-gentleman",
    name: { en: "The Young Gentleman", es: "El Joven Caballero" },
    blurb: {
      en: "For guests twelve and under. Same chair, same standard, less ceremony.",
      es: "Para clientes de doce años o menos. Misma silla, mismo estándar, menos ceremonia.",
    },
    minutes: 30,
    from: 30,
  },
];

export type Barber = {
  slug: string;
  name: string;
  title: Bi;
  bio: Bi;
  specialties: Bi;
  languages: string;
  /** Initials render in the portrait plate until real photography arrives. */
  initials: string;
};

/** CONFIRM — roster, bios, and photography pending owner intake. */
export const barbers: Barber[] = [
  {
    slug: "chair-one",
    name: "Barber One",
    initials: "I",
    title: { en: "Master Barber", es: "Barbero Maestro" },
    bio: {
      en: "Fifteen years behind the chair and a preference for the quiet, exact kind of work.",
      es: "Quince años detrás de la silla y preferencia por el trabajo callado y exacto.",
    },
    specialties: { en: "Skin fades · Classic scissor work", es: "Skin fades · Trabajo clásico a tijera" },
    languages: "EN · ES",
  },
  {
    slug: "chair-two",
    name: "Barber Two",
    initials: "II",
    title: { en: "Senior Barber", es: "Barbero Sénior" },
    bio: {
      en: "Known for beards that look grown rather than cut, and for remembering how you take your coffee.",
      es: "Conocido por barbas que parecen crecidas y no cortadas, y por recordar cómo tomas el café.",
    },
    specialties: { en: "Beard sculpting · Straight razor", es: "Diseño de barba · Navaja" },
    languages: "EN · ES",
  },
  {
    slug: "chair-three",
    name: "Barber Three",
    initials: "III",
    title: { en: "Barber", es: "Barbero" },
    bio: {
      en: "Fast hands, patient eye. The one to see when you want something changed, not maintained.",
      es: "Manos rápidas, ojo paciente. El indicado cuando quieres un cambio, no mantenimiento.",
    },
    specialties: { en: "Design work · Textured crops", es: "Diseños · Cortes texturizados" },
    languages: "EN · ES",
  },
  {
    slug: "chair-four",
    name: "Barber Four",
    initials: "IV",
    title: { en: "Barber", es: "Barbero" },
    bio: {
      en: "Trained on classic cuts and never lost the habit of finishing by hand.",
      es: "Formado en cortes clásicos y nunca perdió la costumbre de terminar a mano.",
    },
    specialties: { en: "Tapers · Hot towel shaves", es: "Degradados · Afeitados con toalla" },
    languages: "EN · ES",
  },
  {
    slug: "chair-five",
    name: "Barber Five",
    initials: "V",
    title: { en: "Barber", es: "Barbero" },
    bio: {
      en: "Quietly the most requested chair on Saturdays. Book ahead.",
      es: "En silencio, la silla más solicitada los sábados. Reserva con tiempo.",
    },
    specialties: { en: "Kids' cuts · Line-ups", es: "Cortes para niños · Perfilados" },
    languages: "EN · ES",
  },
];

export type Tier = {
  slug: string;
  name: Bi;
  /** CONFIRM — membership pricing pending owner approval. */
  price: number;
  cadence: Bi;
  perks: Bi[];
  featured?: boolean;
};

export const tiers: Tier[] = [
  {
    slug: "the-standing",
    name: { en: "The Standing", es: "La Fija" },
    price: 65,
    cadence: { en: "per month", es: "al mes" },
    perks: [
      { en: "One signature cut each month", es: "Un corte signature cada mes" },
      { en: "Priority on the standing-appointment list", es: "Prioridad en la lista de citas fijas" },
      { en: "10% off retail", es: "10% de descuento en productos" },
    ],
  },
  {
    slug: "the-fortnight",
    name: { en: "The Fortnight", es: "La Quincenal" },
    price: 110,
    cadence: { en: "per month", es: "al mes" },
    perks: [
      { en: "Two cuts each month", es: "Dos cortes cada mes" },
      { en: "Complimentary beard tidy between visits", es: "Retoque de barba de cortesía entre visitas" },
      { en: "Priority booking window", es: "Ventana de reserva prioritaria" },
      { en: "15% off retail", es: "15% de descuento en productos" },
    ],
    featured: true,
  },
  {
    slug: "the-lounge",
    name: { en: "The Lounge", es: "La Lounge" },
    price: 190,
    cadence: { en: "per month", es: "al mes" },
    perks: [
      { en: "Unlimited cuts and beard work", es: "Cortes y barba ilimitados" },
      { en: "After-hours appointments on request", es: "Citas fuera de horario a solicitud" },
      { en: "A guest visit each month", es: "Una visita de invitado cada mes" },
      { en: "20% off retail", es: "20% de descuento en productos" },
    ],
  },
];

/** Page-level copy, same shape as the existing dictionary. */
export const copy = {
  common: {
    book: { en: "Reserve a chair", es: "Reserva una silla" },
    from: { en: "from", es: "desde" },
    minutes: { en: "min", es: "min" },
    closed: { en: "Closed", es: "Cerrado" },
    scrollHint: { en: "Scroll to discover", es: "Desplázate para descubrir" },
    confirmNote: {
      en: "Pricing and hours are being finalized with the shop.",
      es: "Los precios y el horario se están finalizando con la barbería.",
    },
  },
  services: {
    eyebrow: { en: "The Menu", es: "El Menú" },
    title: { en: "Services", es: "Servicios" },
    lead: {
      en: "Six ways to sit down. Every one of them ends with a hot towel and a straight edge.",
      es: "Seis maneras de sentarse. Todas terminan con toalla caliente y filo recto.",
    },
  },
  barbers: {
    eyebrow: { en: "The Chairs", es: "Las Sillas" },
    title: { en: "Barbers", es: "Barberos" },
    lead: {
      en: "Five chairs, five hands, one standard. Choose a barber or let us match you.",
      es: "Cinco sillas, cinco manos, un estándar. Elige barbero o deja que te recomendemos.",
    },
  },
  membership: {
    eyebrow: { en: "Standing Appointments", es: "Citas Fijas" },
    title: { en: "Membership", es: "Membresía" },
    lead: {
      en: "For the men who would rather not think about it. A chair held, a rhythm kept.",
      es: "Para quienes prefieren no pensarlo. Una silla apartada, un ritmo constante.",
    },
    note: {
      en: "Memberships open with the shop. Add your name and we will reach out first.",
      es: "Las membresías abren con la barbería. Deja tu nombre y te contactamos primero.",
    },
  },
  visit: {
    eyebrow: { en: "Find Us", es: "Encuéntranos" },
    title: { en: "Visit", es: "Visítanos" },
    lead: {
      en: "Suite 106, off Tilton Road. Park at the door and walk straight in.",
      es: "Suite 106, sobre Tilton Road. Estaciónate en la puerta y entra directo.",
    },
    hoursTitle: { en: "Hours", es: "Horario" },
    findTitle: { en: "Getting here", es: "Cómo llegar" },
    parking: {
      en: "Free parking directly in front of the suite.",
      es: "Estacionamiento gratuito justo frente a la suite.",
    },
    directions: { en: "Open in Maps", es: "Abrir en Maps" },
  },
  about: {
    eyebrow: { en: "The Room", es: "El Salón" },
    title: { en: "About", es: "Nosotros" },
    lead: {
      en: "A quiet room poured in brass and leather, built for the oldest trade there is.",
      es: "Un salón silencioso en latón y cuero, hecho para el oficio más antiguo que existe.",
    },
    body: {
      en: "Luxury Barber Lounge was built around a simple idea: that a haircut is worth an hour, not twenty minutes. Low light, good conversation, and a barber who knows your name and how you wear it. Everything here — the chairs, the towels, the pace — is arranged so you leave sharper than you arrived, and in no particular hurry to.",
      es: "Luxury Barber Lounge nació de una idea simple: que un corte merece una hora, no veinte minutos. Luz baja, buena conversación y un barbero que conoce tu nombre y cómo lo llevas. Todo aquí — las sillas, las toallas, el ritmo — está dispuesto para que salgas más afilado de lo que llegaste, y sin ninguna prisa por hacerlo.",
    },
  },
} as const;
