/**
 * Centralized, editable business and marketing content.
 *
 * Public pages read from this file today. The Supabase content tables mirror
 * these shapes so the admin portal can replace local content without a redesign.
 * Values marked `contentStatus: "curated-placeholder"` are professionally
 * written launch content and must be confirmed by the owner before live billing,
 * payroll, or legal reliance.
 */

export type Lang = "en" | "es";
export type Bi = { en: string; es: string };
export type ContentStatus = "confirmed" | "curated-placeholder" | "integration-required";

export const business = {
  name: "Luxury Barber Lounge",
  legalName: "Luxury Barber Lounge, LLC",
  street: "801 Tilton Road, Suite 106A",
  city: "Northfield",
  state: "NJ",
  postalCode: "08225",
  county: "Atlantic County",
  country: "US",
  phone: "(609) 338-1876",
  bookingPhone: "(609) 338-1876",
  phoneHref: "tel:+16093381876",
  email: "info@theluxurybarberlounge.com",
  statementsEmail: "info@theluxurybarberlounge.com",
  domain: "https://www.theluxurybarberlounge.com",
  mapsUrl: "https://maps.app.goo.gl/JpLgr89PxyVQzSsx7",
  googleBusinessUrl: "https://share.google/hDyTg77M6c4LdIX3o",
  instagram: "https://instagram.com/luxury_barberlounge",
  instagramHandle: "@luxury_barberlounge",
  facebook: "https://www.facebook.com/theluxurybarberlounge",
  ownerName: "Rubén Diaz, Jr.",
  ownerLanguage: ["English", "Spanish"],
  yearOpened: 2026,
  timezone: "America/New_York",
  currency: "USD",
  brandWords: ["Luxurious", "Refined", "Distinctive"],
  tagline: {
    en: "Where precision grooming meets luxury experience.",
    es: "Donde el grooming de precisión se encuentra con una experiencia de lujo.",
  },
  shortDescription: {
    en: "A luxury barbershop in Northfield, New Jersey offering precision cuts, fades, beard services, hot-towel rituals, and personalized grooming.",
    es: "Una barbería de lujo en Northfield, Nueva Jersey, con cortes de precisión, fades, barba, rituales de toalla caliente y atención personalizada.",
  },
  parking: {
    en: "On-site parking is available near Suite 106A.",
    es: "Hay estacionamiento en el lugar cerca de la Suite 106A.",
  },
  grandOpening: {
    date: "2026-08-04",
    time: "5:00 PM",
    label: { en: "NOW OPEN · NORTHFIELD · RESERVATIONS & WALK-INS", es: "YA ABIERTO · NORTHFIELD · RESERVAS Y CLIENTES SIN RESERVA" },
  },
  ownerConfirmation: [
    "Rubén Diaz, Jr. recurring booking schedule, languages, walk-in setting, and public social link",
    "Angelica Aquino complete working-day range after Wednesday",
    "Barber Lo's years cutting, working days, and Instagram handle",
    "Exact Instagram punctuation for Alfredo Hernandez (Pollo)",
    "Instagram handles for Russ Hawkins, Elvis, and Jose",
    "Cancellation, no-show, refund, and membership legal terms",
    "Square catalog, location, and team-member mappings",
  ],
  accessibility: {
    en: "Contact the lounge before your visit for mobility, sensory, or communication accommodations.",
    es: "Comunícate con el salón antes de tu visita para solicitar adaptaciones de movilidad, sensoriales o de comunicación.",
  },
  contentStatus: "confirmed" as ContentStatus,
} as const;

export const hours: { day: Bi; weekday: number; open: string; close: string; closed?: boolean }[] = [
  { day: { en: "Sunday", es: "Domingo" }, weekday: 0, open: "09:00", close: "16:00" },
  { day: { en: "Monday", es: "Lunes" }, weekday: 1, open: "", close: "", closed: true },
  { day: { en: "Tuesday", es: "Martes" }, weekday: 2, open: "08:00", close: "21:00" },
  { day: { en: "Wednesday", es: "Miercoles" }, weekday: 3, open: "08:00", close: "21:00" },
  { day: { en: "Thursday", es: "Jueves" }, weekday: 4, open: "08:00", close: "21:00" },
  { day: { en: "Friday", es: "Viernes" }, weekday: 5, open: "08:00", close: "21:00" },
  { day: { en: "Saturday", es: "Sabado" }, weekday: 6, open: "08:00", close: "21:00" },
];

export type ServiceCategory = {
  slug: string;
  name: Bi;
  description: Bi;
};

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "haircuts-fades",
    name: { en: "Haircuts & Fades", es: "Cortes y Fades" },
    description: {
      en: "Haircuts, fades, line-ups, age-based cuts, and custom design work.",
      es: "Cortes, fades, line-ups, cortes por edad y disenos personalizados.",
    },
  },
  {
    slug: "beard-shaves",
    name: { en: "Beard & Shaves", es: "Barba y Afeitados" },
    description: {
      en: "Beard services, combined haircut appointments, and hot-towel shaving.",
      es: "Servicios de barba, citas combinadas y afeitado con toalla caliente.",
    },
  },
  {
    slug: "specialty",
    name: { en: "Specialty Services", es: "Servicios Especiales" },
    description: {
      en: "Specialty grooming services offered by eligible barbers.",
      es: "Servicios especiales ofrecidos por barberos elegibles.",
    },
  },
];

export type Service = {
  slug: string;
  category: string;
  name: Bi;
  shortName?: Bi;
  blurb: Bi;
  description: Bi;
  minutes: number;
  from: number;
  deposit: number;
  startingPrice?: boolean;
  featured?: boolean;
  benefits: Bi[];
  preparation: Bi;
  maintenance: Bi;
  tags: string[];
  squareCatalogId?: string;
  contentStatus: ContentStatus;
};

const commonPreparation: Bi = {
  en: "Bring a reference image if it helps explain the result you want.",
  es: "Trae una imagen de referencia si ayuda a explicar el resultado que deseas.",
};

function service(input: Omit<Service, "benefits" | "preparation" | "maintenance" | "tags" | "contentStatus"> & {
  benefits?: Bi[];
  preparation?: Bi;
  maintenance?: Bi;
  tags?: string[];
  contentStatus?: ContentStatus;
}): Service {
  return {
    ...input,
    benefits: input.benefits ?? [
      { en: "Service time reserved for the selected appointment", es: "Tiempo reservado para el servicio seleccionado" },
      { en: "Final price shown before confirmation", es: "Precio final mostrado antes de confirmar" },
    ],
    preparation: input.preparation ?? commonPreparation,
    maintenance: input.maintenance ?? {
      en: "Rebooking timing depends on the style and maintenance preference.",
      es: "El momento de volver depende del estilo y la preferencia de mantenimiento.",
    },
    tags: input.tags ?? [],
    contentStatus: input.contentStatus ?? "confirmed",
  };
}

export const services: Service[] = [
  service({
    slug: "haircut",
    category: "haircuts-fades",
    name: { en: "Haircut", es: "Corte" },
    blurb: { en: "A full haircut appointment.", es: "Una cita completa de corte." },
    description: { en: "A 60-minute haircut service offered by all active eligible barbers.", es: "Servicio de corte de 60 minutos ofrecido por todos los barberos activos elegibles." },
    minutes: 60,
    from: 50,
    deposit: 25,
    featured: true,
    tags: ["haircut"],
  }),
  service({
    slug: "skin-fade",
    category: "haircuts-fades",
    name: { en: "Skin Fade", es: "Skin Fade" },
    blurb: { en: "A focused skin-fade appointment.", es: "Una cita enfocada en skin fade." },
    description: { en: "A 40-minute skin-fade service offered by all active eligible barbers.", es: "Servicio de skin fade de 40 minutos ofrecido por todos los barberos activos elegibles." },
    minutes: 40,
    from: 50,
    deposit: 25,
    featured: true,
    tags: ["skin fade", "fade"],
  }),
  service({
    slug: "beard",
    category: "beard-shaves",
    name: { en: "Beard", es: "Barba" },
    blurb: { en: "A dedicated beard service.", es: "Un servicio dedicado de barba." },
    description: { en: "A 25-minute beard service offered by all active eligible barbers.", es: "Servicio de barba de 25 minutos ofrecido por todos los barberos activos elegibles." },
    minutes: 25,
    from: 15,
    deposit: 7.5,
    tags: ["beard"],
  }),
  service({
    slug: "cut-and-beard",
    category: "beard-shaves",
    name: { en: "Cut + Beard", es: "Corte + Barba" },
    blurb: { en: "Haircut and beard service in one appointment.", es: "Corte y barba en una sola cita." },
    description: { en: "A 60-minute haircut and beard service offered by all active eligible barbers.", es: "Servicio de corte y barba de 60 minutos ofrecido por todos los barberos activos elegibles." },
    minutes: 60,
    from: 50,
    deposit: 25,
    featured: true,
    tags: ["haircut", "beard"],
  }),
  service({
    slug: "hot-towel-shave",
    category: "beard-shaves",
    name: { en: "Hot Towel Shave", es: "Afeitado con Toalla Caliente" },
    blurb: { en: "A hot-towel shaving appointment.", es: "Una cita de afeitado con toalla caliente." },
    description: { en: "A 40-minute hot-towel shave offered by all active eligible barbers.", es: "Afeitado con toalla caliente de 40 minutos ofrecido por todos los barberos activos elegibles." },
    minutes: 40,
    from: 45,
    deposit: 22.5,
    tags: ["hot towel", "shave"],
  }),
  service({
    slug: "kids-haircut",
    category: "haircuts-fades",
    name: { en: "Kids Haircut", es: "Corte para Ninos" },
    blurb: { en: "Haircut pricing for children age 10 and younger.", es: "Precio de corte para ninos de 10 anos o menos." },
    description: { en: "A 40-minute kids haircut. The client-provided age limit is 10 years old.", es: "Corte infantil de 40 minutos. El limite de edad provisto es 10 anos." },
    minutes: 40,
    from: 35,
    deposit: 17.5,
    tags: ["kids", "age 10"],
  }),
  service({
    slug: "senior-haircut",
    category: "haircuts-fades",
    name: { en: "Senior Haircut", es: "Corte para Adulto Mayor" },
    blurb: { en: "Haircut pricing for clients age 55 and older.", es: "Precio de corte para clientes de 55 anos o mas." },
    description: { en: "A 35-minute senior haircut. The client-provided age threshold is 55 years old.", es: "Corte para adulto mayor de 35 minutos. La edad provista es 55 anos." },
    minutes: 35,
    from: 40,
    deposit: 20,
    tags: ["senior", "age 55"],
  }),
  service({
    slug: "line-up",
    category: "haircuts-fades",
    name: { en: "Line-Up", es: "Line-Up" },
    blurb: { en: "A dedicated line-up appointment.", es: "Una cita dedicada de line-up." },
    description: { en: "A 20-minute line-up service offered by all active eligible barbers.", es: "Servicio de line-up de 20 minutos ofrecido por todos los barberos activos elegibles." },
    minutes: 20,
    from: 25,
    deposit: 12.5,
    tags: ["line-up"],
  }),
  service({
    slug: "design",
    category: "specialty",
    name: { en: "Design", es: "Diseno" },
    blurb: { en: "Custom design service offered by Barber Lo's.", es: "Servicio de diseno personalizado ofrecido por Barber Lo's." },
    description: { en: "A 60-minute design service starting at $150. Barber Lo's is the confirmed provider.", es: "Servicio de diseno de 60 minutos desde $150. Barber Lo's es el proveedor confirmado." },
    minutes: 60,
    from: 150,
    deposit: 75,
    startingPrice: true,
    tags: ["design"],
  }),
];

export const unavailableServices = [
  {
    slug: "color",
    name: { en: "Color", es: "Color" },
    availability: { en: "Not currently offered", es: "No disponible actualmente" },
  },
] as const;

export const serviceAddOns: Array<{ slug: string; name: Bi; minutes: number; price: number }> = [];


export type Barber = {
  slug: string;
  name: string;
  title: Bi;
  bio: Bi;
  story: Bi;
  specialties: Bi;
  specialtyTags: string[];
  languages: string;
  languageCodes?: string[];
  compactName?: string;
  owner?: boolean;
  initials: string;
  serviceSlugs: string[];
  image: {
    original: string;
    card: string;
    cardAvif: string;
    cardJpeg: string;
    profile: string;
    profileAvif: string;
    profileJpeg: string;
    booking: string;
    bookingAvif: string;
    bookingJpeg: string;
    mobile: string;
    mobileAvif: string;
    mobileJpeg: string;
    tablet: string;
    tabletAvif: string;
    tabletJpeg: string;
    desktop: string;
    desktopAvif: string;
    desktopJpeg: string;
    alt: Bi;
    objectPosition: { card: string; profile: string; mobile: string; booking: string };
  };
  identityStatus: "verified" | "temporary";
  availability: Bi;
  workingDays: Bi;
  bookingWeekdays: number[];
  walkIns: boolean;
  photoProvided: boolean;
  yearsCutting?: string;
  instagramHandle?: string;
  socialUrl?: string;
  socialStatus: "active" | "pending-confirmation" | "not-provided";
  squareTeamMemberId?: string;
  active: boolean;
  featured?: boolean;
  sortOrder: number;
  contentStatus: ContentStatus;
};

function createBarberImage(
  slug: string,
  alt: Bi,
  objectPosition: Barber["image"]["objectPosition"],
): Barber["image"] {
  const root = `/media/barbers`;
  return {
    original: `${root}/originals/${slug}.jpeg`,
    card: `${root}/cards/${slug}.webp`,
    cardAvif: `${root}/cards/${slug}.avif`,
    cardJpeg: `${root}/cards/${slug}.jpg`,
    profile: `${root}/profiles/${slug}.webp`,
    profileAvif: `${root}/profiles/${slug}.avif`,
    profileJpeg: `${root}/profiles/${slug}.jpg`,
    booking: `${root}/booking/${slug}.webp`,
    bookingAvif: `${root}/booking/${slug}.avif`,
    bookingJpeg: `${root}/booking/${slug}.jpg`,
    mobile: `${root}/mobile/${slug}.webp`,
    mobileAvif: `${root}/mobile/${slug}.avif`,
    mobileJpeg: `${root}/mobile/${slug}.jpg`,
    tablet: `${root}/tablet/${slug}.webp`,
    tabletAvif: `${root}/tablet/${slug}.avif`,
    tabletJpeg: `${root}/tablet/${slug}.jpg`,
    desktop: `${root}/desktop/${slug}.webp`,
    desktopAvif: `${root}/desktop/${slug}.avif`,
    desktopJpeg: `${root}/desktop/${slug}.jpg`,
    alt,
    objectPosition,
  };
}

export const founderProfile = {
  slug: "ruben-diaz-jr",
  name: "Rubén Diaz, Jr.",
  image: {
    profile: "/media/barbers/profiles/ruben-diaz-jr.webp",
    profileAvif: "/media/barbers/profiles/ruben-diaz-jr.avif",
    alt: { en: "Rubén Diaz, Jr., owner and master barber at Luxury Barber Lounge", es: "Rubén Diaz, Jr., propietario y maestro barbero de Luxury Barber Lounge" },
    objectPosition: { profile: "50% 22%" },
  },
} as const;

const allStandardServices = ["haircut", "skin-fade", "beard", "cut-and-beard", "hot-towel-shave", "kids-haircut", "senior-haircut", "line-up"];

export const barbers: Barber[] = [
  {
    slug: "ruben-diaz-jr",
    name: "Rubén Diaz, Jr.",
    compactName: "Ruben",
    initials: "RD",
    title: { en: "Owner and Master Barber", es: "Propietario y Maestro Barbero" },
    bio: { en: "Rubén Diaz, Jr. founded Luxury Barber Lounge to elevate the traditional barbershop experience through precision, personal service, confidence, and a refined atmosphere.", es: "Rubén Diaz, Jr. fundó Luxury Barber Lounge para elevar la experiencia tradicional de barbería mediante precisión, servicio personal, confianza y un ambiente refinado." },
    story: { en: "His approach combines disciplined craftsmanship with a commitment to making every client feel recognized, comfortable, and distinguished.", es: "Su enfoque combina una técnica disciplinada con el compromiso de hacer que cada cliente se sienta reconocido, cómodo y distinguido." },
    specialties: { en: "Precision grooming, personal service, and refined barbering", es: "Grooming de precisión, servicio personal y barbería refinada" },
    specialtyTags: ["precision grooming", "personal service", "refined barbering"],
    languages: "Confirm with lounge",
    languageCodes: [],
    serviceSlugs: allStandardServices,
    image: createBarberImage("ruben-diaz-jr", { en: "Rubén Diaz, Jr. of Luxury Barber Lounge", es: "Rubén Diaz, Jr. de Luxury Barber Lounge" }, { card: "50% 24%", profile: "50% 24%", mobile: "50% 22%", booking: "50% 24%" }),
    identityStatus: "verified",
    availability: { en: "Bookable when the owner schedule is published. Contact the lounge for current availability.", es: "Disponible para reservar cuando se publique el horario del propietario. Comunícate con el lounge para confirmar disponibilidad." },
    workingDays: { en: "Pending owner schedule confirmation", es: "Pendiente de confirmación del horario del propietario" },
    bookingWeekdays: [],
    walkIns: false,
    photoProvided: true,
    socialStatus: "not-provided",
    active: true,
    featured: true,
    owner: true,
    sortOrder: 0,
    contentStatus: "confirmed",
  },
  {
    slug: "angelica-aquino",
    name: "Angelica Aquino",
    initials: "AA",
    title: { en: "Manager", es: "Gerente" },
    bio: { en: "Clean cuts. Sharp fades. Quality service. Book your appointment and leave looking your best.", es: "Cortes limpios, fades precisos y servicio de calidad para que salgas luciendo lo mejor posible." },
    story: { en: "Angelica is the lounge manager and provides all types of haircuts with a focus on clean results and quality service.", es: "Angelica es gerente del lounge y ofrece todo tipo de cortes con enfoque en resultados limpios y servicio de calidad." },
    specialties: { en: "All types of haircuts", es: "Todo tipo de cortes" },
    specialtyTags: ["all types of haircuts"],
    languages: "EN · ES",
    serviceSlugs: allStandardServices,
    image: createBarberImage("angelica-aquino", { en: "Angelica Aquino of Luxury Barber Lounge", es: "Angelica Aquino de Luxury Barber Lounge" }, { card: "50% 20%", profile: "50% 18%", mobile: "50% 18%", booking: "50% 20%" }),
    identityStatus: "verified",
    availability: { en: "Wednesday is confirmed. Additional working days are pending owner confirmation.", es: "Miercoles esta confirmado. Los dias adicionales esperan confirmacion." },
    workingDays: { en: "Wednesday confirmed; remaining range pending", es: "Miercoles confirmado; rango restante pendiente" },
    bookingWeekdays: [3],
    walkIns: true,
    photoProvided: true,
    yearsCutting: "3",
    instagramHandle: "angelicutz_",
    socialUrl: "https://instagram.com/angelicutz_",
    socialStatus: "active",
    active: true,
    featured: true,
    sortOrder: 1,
    contentStatus: "confirmed",
  },
  {
    slug: "hommy-rivera",
    name: "Hommy Rivera",
    initials: "HR",
    title: { en: "Barber", es: "Barbero" },
    bio: { en: "An experienced barber offering all types of haircuts in English and Spanish.", es: "Barbero con experiencia que ofrece todo tipo de cortes en ingles y espanol." },
    story: { en: "Hommy has 13 years of cutting experience and works Tuesday through Sunday.", es: "Hommy tiene 13 anos de experiencia y trabaja de martes a domingo." },
    specialties: { en: "All types of haircuts", es: "Todo tipo de cortes" },
    specialtyTags: ["all types of haircuts"],
    languages: "ES · EN",
    serviceSlugs: allStandardServices,
    image: createBarberImage("hommy-rivera", { en: "Hommy Rivera of Luxury Barber Lounge", es: "Hommy Rivera de Luxury Barber Lounge" }, { card: "50% 24%", profile: "50% 22%", mobile: "50% 22%", booking: "50% 24%" }),
    identityStatus: "verified",
    availability: { en: "Tuesday through Sunday", es: "Martes a domingo" },
    workingDays: { en: "Tuesday through Sunday", es: "Martes a domingo" },
    bookingWeekdays: [2, 3, 4, 5, 6, 0],
    walkIns: true,
    photoProvided: true,
    yearsCutting: "13",
    instagramHandle: "Cutzby_hommy",
    socialUrl: "https://instagram.com/Cutzby_hommy",
    socialStatus: "active",
    active: true,
    featured: true,
    sortOrder: 2,
    contentStatus: "confirmed",
  },
  {
    slug: "barber-los",
    name: "Barber Lo's",
    initials: "BL",
    title: { en: "Barber", es: "Barbero" },
    bio: { en: "A bilingual barber offering all types of haircuts and custom designs.", es: "Barbero bilingue que ofrece todo tipo de cortes y disenos personalizados." },
    story: { en: "Barber Lo's is the confirmed provider for design services. Years cutting, working days, and Instagram are pending confirmation.", es: "Barber Lo's es el proveedor confirmado para disenos. Anos, dias e Instagram estan pendientes." },
    specialties: { en: "All types of haircuts · Designs", es: "Todo tipo de cortes · Disenos" },
    specialtyTags: ["all types of haircuts", "designs"],
    languages: "ES · EN",
    serviceSlugs: [...allStandardServices, "design"],
    image: createBarberImage("barber-los", { en: "Barber Lo's of Luxury Barber Lounge", es: "Barber Lo's de Luxury Barber Lounge" }, { card: "50% 18%", profile: "50% 18%", mobile: "50% 18%", booking: "50% 18%" }),
    identityStatus: "verified",
    availability: { en: "Schedule pending owner confirmation. Call the lounge for current openings.", es: "Horario pendiente. Llama al lounge para disponibilidad." },
    workingDays: { en: "Pending owner confirmation", es: "Pendiente de confirmacion" },
    bookingWeekdays: [],
    walkIns: false,
    photoProvided: true,
    socialStatus: "not-provided",
    active: true,
    sortOrder: 3,
    contentStatus: "confirmed",
  },
  {
    slug: "jose",
    name: "Jose",
    initials: "JO",
    title: { en: "Barber", es: "Barbero" },
    bio: { en: "Detailed haircuts, crispy fades, and sharp hairlines.", es: "Cortes detallados, fades precisos y lineas definidas." },
    story: { en: "Jose has 12+ years of cutting experience and specializes in hot-towel services and facials.", es: "Jose tiene mas de 12 anos de experiencia y se especializa en toalla caliente y faciales." },
    specialties: { en: "Hot towel services · Facials", es: "Servicios de toalla caliente · Faciales" },
    specialtyTags: ["hot towel services", "facials"],
    languages: "EN · ES",
    serviceSlugs: allStandardServices,
    image: createBarberImage("jose", { en: "Jose of Luxury Barber Lounge", es: "Jose de Luxury Barber Lounge" }, { card: "50% 18%", profile: "50% 18%", mobile: "50% 18%", booking: "50% 18%" }),
    identityStatus: "verified",
    availability: { en: "Tuesday through Saturday", es: "Martes a sabado" },
    workingDays: { en: "Tuesday through Saturday", es: "Martes a sabado" },
    bookingWeekdays: [2, 3, 4, 5, 6],
    walkIns: true,
    photoProvided: true,
    yearsCutting: "12+",
    socialStatus: "pending-confirmation",
    active: true,
    sortOrder: 4,
    contentStatus: "confirmed",
  },
  {
    slug: "elvis",
    name: "Elvis",
    initials: "EL",
    title: { en: "Barber", es: "Barbero" },
    bio: { en: "Premium cuts, precision fades, and elevated style.", es: "Cortes premium, fades de precision y estilo elevado." },
    story: { en: "Elvis specializes in fluffy texture and fringe and works Tuesday through Sunday.", es: "Elvis se especializa en textura fluffy y fringe y trabaja de martes a domingo." },
    specialties: { en: "Fluffy texture · Fringe", es: "Textura fluffy · Fringe" },
    specialtyTags: ["fluffy texture", "fringe"],
    languages: "EN · ES",
    serviceSlugs: allStandardServices,
    image: createBarberImage("elvis", { en: "Elvis of Luxury Barber Lounge", es: "Elvis de Luxury Barber Lounge" }, { card: "50% 16%", profile: "50% 16%", mobile: "50% 16%", booking: "50% 16%" }),
    identityStatus: "verified",
    availability: { en: "Tuesday through Sunday", es: "Martes a domingo" },
    workingDays: { en: "Tuesday through Sunday", es: "Martes a domingo" },
    bookingWeekdays: [2, 3, 4, 5, 6, 0],
    walkIns: true,
    photoProvided: true,
    socialStatus: "pending-confirmation",
    active: true,
    sortOrder: 5,
    contentStatus: "confirmed",
  },
  {
    slug: "alfredo-hernandez-pollo",
    name: "Alfredo Hernandez (Pollo)",
    initials: "AH",
    title: { en: "Barber", es: "Barbero" },
    bio: { en: "A bilingual barber offering all types of haircuts.", es: "Barbero bilingue que ofrece todo tipo de cortes." },
    story: { en: "Alfredo has 3 years of cutting experience and works Tuesday through Saturday.", es: "Alfredo tiene 3 anos de experiencia y trabaja de martes a sabado." },
    specialties: { en: "All types of haircuts", es: "Todo tipo de cortes" },
    specialtyTags: ["all types of haircuts"],
    languages: "EN · ES",
    serviceSlugs: allStandardServices,
    image: createBarberImage("alfredo-hernandez-pollo", { en: "Alfredo Hernandez, known as Pollo, of Luxury Barber Lounge", es: "Alfredo Hernandez, conocido como Pollo, de Luxury Barber Lounge" }, { card: "50% 18%", profile: "50% 18%", mobile: "50% 18%", booking: "50% 18%" }),
    identityStatus: "verified",
    availability: { en: "Tuesday through Saturday", es: "Martes a sabado" },
    workingDays: { en: "Tuesday through Saturday", es: "Martes a sabado" },
    bookingWeekdays: [2, 3, 4, 5, 6],
    walkIns: true,
    photoProvided: true,
    yearsCutting: "3",
    instagramHandle: "Pollo.da.barber",
    socialStatus: "pending-confirmation",
    active: true,
    sortOrder: 6,
    contentStatus: "confirmed",
  },
  {
    slug: "russ-hawkins",
    name: "Russ Hawkins",
    initials: "RH",
    title: { en: "Barber", es: "Barbero" },
    bio: { en: "An experienced barber offering all types of haircuts in English.", es: "Barbero con experiencia que ofrece todo tipo de cortes en ingles." },
    story: { en: "Russ has 10 years of cutting experience and works Tuesday through Saturday.", es: "Russ tiene 10 anos de experiencia y trabaja de martes a sabado." },
    specialties: { en: "All types of haircuts", es: "Todo tipo de cortes" },
    specialtyTags: ["all types of haircuts"],
    languages: "EN",
    serviceSlugs: allStandardServices,
    image: createBarberImage("russ-hawkins", { en: "Russ Hawkins of Luxury Barber Lounge", es: "Russ Hawkins de Luxury Barber Lounge" }, { card: "50% 20%", profile: "50% 20%", mobile: "50% 20%", booking: "50% 20%" }),
    identityStatus: "verified",
    availability: { en: "Tuesday through Saturday", es: "Martes a sabado" },
    workingDays: { en: "Tuesday through Saturday", es: "Martes a sabado" },
    bookingWeekdays: [2, 3, 4, 5, 6],
    walkIns: true,
    photoProvided: true,
    yearsCutting: "10",
    socialStatus: "pending-confirmation",
    active: true,
    sortOrder: 7,
    contentStatus: "confirmed",
  },
  {
    slug: "daniel-penalo",
    name: "Daniel Penalo",
    initials: "DP",
    title: { en: "Barber", es: "Barbero" },
    bio: { en: "An experienced Spanish-speaking barber offering all types of haircuts.", es: "Barbero con experiencia que ofrece todo tipo de cortes en espanol." },
    story: { en: "Daniel has 14 years of cutting experience and works Tuesday through Saturday.", es: "Daniel tiene 14 anos de experiencia y trabaja de martes a sabado." },
    specialties: { en: "All types of haircuts", es: "Todo tipo de cortes" },
    specialtyTags: ["all types of haircuts"],
    languages: "ES",
    serviceSlugs: allStandardServices,
    image: createBarberImage("daniel-penalo", { en: "Daniel Penalo of Luxury Barber Lounge", es: "Daniel Penalo de Luxury Barber Lounge" }, { card: "50% 16%", profile: "50% 16%", mobile: "50% 16%", booking: "50% 16%" }),
    identityStatus: "verified",
    availability: { en: "Tuesday through Saturday", es: "Martes a sabado" },
    workingDays: { en: "Tuesday through Saturday", es: "Martes a sabado" },
    bookingWeekdays: [2, 3, 4, 5, 6],
    walkIns: true,
    photoProvided: true,
    yearsCutting: "14",
    instagramHandle: "daniel.barbershop97",
    socialUrl: "https://instagram.com/daniel.barbershop97",
    socialStatus: "active",
    active: true,
    sortOrder: 8,
    contentStatus: "confirmed",
  },
];

export type Tier = {
  slug: string;
  name: Bi;
  price: number;
  cadence: Bi;
  description: Bi;
  perks: Bi[];
  durationWeeks: number;
  billingInterval: "one_time" | "month" | "year";
  featured?: boolean;
  contentStatus: ContentStatus;
};

export const tiers: Tier[] = [
  {
    slug: "annual-52-week",
    name: { en: "1 Year Membership", es: "Membresia de 1 Ano" },
    price: 1300,
    cadence: { en: "52 weeks", es: "52 semanas" },
    description: { en: "Owner-provided annual membership plan.", es: "Plan anual provisto por el propietario." },
    perks: [
      { en: "Full haircut and beard plus hot towel", es: "Corte completo y barba mas toalla caliente" },
    ],
    durationWeeks: 52,
    billingInterval: "year",
    contentStatus: "confirmed",
  },
  {
    slug: "monthly-4-week",
    name: { en: "1 Month Membership", es: "Membresia de 1 Mes" },
    price: 150,
    cadence: { en: "4 weeks", es: "4 semanas" },
    description: { en: "Owner-provided four-week membership plan.", es: "Plan de cuatro semanas provisto por el propietario." },
    perks: [
      { en: "Full haircut and beard plus hot towel", es: "Corte completo y barba mas toalla caliente" },
    ],
    durationWeeks: 4,
    billingInterval: "month",
    featured: true,
    contentStatus: "confirmed",
  },
];

export const packages = [
  {
    slug: "executive-grooming",
    name: { en: "Executive Grooming", es: "Grooming Ejecutivo" },
    description: { en: "Full haircut, beard, shampoo, and hot towel.", es: "Corte completo, barba, champu y toalla caliente." },
    from: 175,
  },
  {
    slug: "father-and-son",
    name: { en: "Father & Son", es: "Padre e Hijo" },
    description: { en: "Regular haircut. The owner-provided wording is preserved pending more detailed inclusions.", es: "Corte regular. Se conserva la redaccion provista pendiente de mas detalles." },
    from: 70,
  },
  {
    slug: "wedding-event",
    name: { en: "Wedding / Event", es: "Boda / Evento" },
    description: { en: "Full haircut, beard, shampoo, hot towel, regular facial, and photo.", es: "Corte completo, barba, champu, toalla caliente, facial regular y foto." },
    from: 700,
  },
] as const;

export const giftCards = {
  offered: true,
  startingAmount: 50,
  label: { en: "Gift cards and vouchers", es: "Tarjetas de regalo y vouchers" },
} as const;

export const faqs: { question: Bi; answer: Bi; category: string }[] = [
  { category: "booking", question: { en: "Do you accept walk-ins?", es: "Aceptan clientes sin cita?" }, answer: { en: "Yes. Walk-ins are accepted any time during open business hours, subject to real-time capacity. Barber Lo's is not configured for walk-ins.", es: "Si. Se aceptan walk-ins durante el horario abierto, sujeto a capacidad. Barber Lo's no acepta walk-ins." } },
  { category: "booking", question: { en: "Is a deposit required?", es: "Se requiere deposito?" }, answer: { en: "Yes. The required deposit is 50% of the booking total.", es: "Si. El deposito requerido es 50% del total de la reserva." } },
  { category: "booking", question: { en: "How early should I arrive?", es: "Con cuanta anticipacion debo llegar?" }, answer: { en: "Arrive five to ten minutes early for check-in and consultation, especially for a first visit.", es: "Llega de cinco a diez minutos antes para registrarte y consultar." } },
  { category: "services", question: { en: "What is the kids price age limit?", es: "Cual es la edad limite para ninos?" }, answer: { en: "The kids haircut price applies through age 10.", es: "El precio infantil aplica hasta los 10 anos." } },
  { category: "services", question: { en: "What is the senior price age threshold?", es: "Cual es la edad para precio senior?" }, answer: { en: "The senior haircut price begins at age 55.", es: "El precio senior comienza a los 55 anos." } },
  { category: "services", question: { en: "Is hair color available?", es: "Ofrecen color de cabello?" }, answer: { en: "No. Color is not currently offered or bookable.", es: "No. Color no se ofrece actualmente." } },
  { category: "policies", question: { en: "What is the cancellation policy?", es: "Cual es la politica de cancelacion?" }, answer: { en: "The final cancellation, no-show, and refund terms require owner approval. The current policy version is shown during booking.", es: "Los terminos finales de cancelacion, no-show y reembolso requieren aprobacion. La version actual aparece al reservar." } },
  { category: "membership", question: { en: "Are memberships available?", es: "Hay membresias disponibles?" }, answer: { en: "The owner-provided plans are published for review. Payment activation depends on the configured commerce provider.", es: "Los planes provistos estan publicados para revision. La activacion de pagos depende del proveedor configurado." } },
  { category: "accessibility", question: { en: "Can I request an accommodation?", es: "Puedo solicitar una adaptacion?" }, answer: { en: "Yes. Contact the lounge before your appointment so the team can prepare reasonable mobility, sensory, or communication support.", es: "Si. Comunicate antes de tu cita para solicitar apoyo razonable." } },
];

export const journalPosts = [
  { slug: "how-often-to-book-a-fade", title: { en: "How Often Should You Rebook a Fade?", es: "¿Cada Cuánto Debes Retocar un Fade?" }, excerpt: { en: "A practical guide to keeping the silhouette clean without overbooking.", es: "Guía práctica para mantener la silueta limpia sin reservar de más." }, publishedAt: "2026-07-18", category: "Maintenance", readingMinutes: 4 },
  { slug: "beard-shape-and-face-balance", title: { en: "Beard Shape and Face Balance", es: "Forma de Barba y Equilibrio Facial" }, excerpt: { en: "Why density, jawline, neckline, and maintenance matter more than copying a reference exactly.", es: "Por qué densidad, mandíbula, cuello y mantenimiento importan más que copiar una referencia." }, publishedAt: "2026-07-10", category: "Beard", readingMinutes: 5 },
  { slug: "prepare-for-your-first-lounge-visit", title: { en: "Preparing for Your First Lounge Visit", es: "Cómo Prepararte para tu Primera Visita" }, excerpt: { en: "What to bring, how to explain the result you want, and what happens in consultation.", es: "Qué traer, cómo explicar el resultado y qué ocurre en la consulta." }, publishedAt: "2026-07-02", category: "Experience", readingMinutes: 3 },
] as const;

export const copy = {
  common: {
    book: { en: "Reserve a chair", es: "Reserva una silla" },
    from: { en: "from", es: "desde" },
    minutes: { en: "min", es: "min" },
    closed: { en: "Closed", es: "Cerrado" },
    scrollHint: { en: "Scroll to discover", es: "Desplázate para descubrir" },
  },
  services: {
    eyebrow: { en: "The Menu", es: "El Menú" },
    title: { en: "Services", es: "Servicios" },
    lead: { en: "Client-confirmed haircuts, fades, beard services, hot-towel shaving, line-ups, and design work.", es: "Cortes, fades, barba, toalla caliente, line-ups y disenos confirmados por el cliente." },
  },
  barbers: {
    eyebrow: { en: "The Chairs", es: "Las Sillas" },
    title: { en: "Barbers", es: "Barberos" },
    lead: { en: "Choose your preferred chair or let the lounge match the service to the right specialist.", es: "Elige tu silla preferida o deja que el salón conecte el servicio con el especialista adecuado." },
  },
  membership: {
    eyebrow: { en: "Standing Appointments", es: "Citas Fijas" },
    title: { en: "Membership", es: "Membresía" },
    lead: { en: "A consistent grooming rhythm with priority access, planned maintenance, and member benefits.", es: "Un ritmo constante de grooming con acceso prioritario, mantenimiento planificado y beneficios." },
    note: { en: "Memberships bill automatically through Square. Cancel anytime — your card is stored securely by Square, never by us.", es: "Las membresias se cobran automaticamente a traves de Square. Cancela cuando quieras — Square guarda tu tarjeta de forma segura, nunca nosotros." },
  },
  visit: {
    eyebrow: { en: "Northfield, New Jersey", es: "Northfield, Nueva Jersey" },
    title: { en: "Visit the Lounge", es: "Visita el Salón" },
    lead: { en: "Suite 106A on Tilton Road, with complimentary parking directly outside.", es: "Suite 106A en Tilton Road, con estacionamiento gratuito justo afuera." },
    hoursTitle: { en: "Hours", es: "Horario" },
    findTitle: { en: "Getting here", es: "Cómo llegar" },
    parking: business.parking,
    directions: { en: "Open directions", es: "Abrir indicaciones" },
  },
  about: {
    eyebrow: { en: "The Room", es: "El Salón" },
    title: { en: "Built Around the Chair", es: "Creado Alrededor de la Silla" },
    lead: { en: "A polished room for precision work, genuine conversation, and service that never feels rushed.", es: "Un espacio pulido para trabajo preciso, conversación auténtica y servicio sin prisa." },
    body: { en: "Luxury Barber Lounge is designed around a simple standard: every guest should understand the service, feel considered in the chair, and leave with a result that fits real life. The atmosphere is elevated, but the purpose remains practical: precise grooming, consistent care, and a relationship worth returning to.", es: "Luxury Barber Lounge se basa en un estándar simple: cada cliente debe entender el servicio, sentirse atendido y salir con un resultado que funcione en la vida real. El ambiente es elevado, pero el propósito es práctico: grooming preciso, cuidado constante y una relación que vale la pena repetir." },
  },
} as const;

export function findService(slug: string) {
  return services.find((item) => item.slug === slug);
}

export function findBarber(slug: string) {
  return barbers.find((item) => item.slug === slug && item.active);
}

export function findJournalPost(slug: string) {
  return journalPosts.find((item) => item.slug === slug);
}
