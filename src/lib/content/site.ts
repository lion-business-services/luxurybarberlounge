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
  street: "801 Tilton Road, Suite 106",
  city: "Northfield",
  state: "NJ",
  postalCode: "08225",
  county: "Atlantic County",
  country: "US",
  phone: "(609) 384-5171",
  bookingPhone: "(609) 384-5171",
  phoneHref: "tel:+16093845171",
  email: "info@theluxurybarberlounge.com",
  statementsEmail: "info@theluxurybarberlounge.com",
  domain: "https://www.theluxurybarberlounge.com",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=801+Tilton+Road+Suite+106+Northfield+NJ+08225",
  googleBusinessUrl: "https://share.google/hDyTg77M6c4LdIX3o",
  instagram: "https://instagram.com/luxury_barberlounge",
  instagramHandle: "@luxury_barberlounge",
  facebook: "https://www.facebook.com/theluxurybarberlounge",
  ownerName: "Rubén Díaz, Jr.",
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
    en: "On-site parking is available near Suite 106.",
    es: "Hay estacionamiento en el lugar cerca de la Suite 106.",
  },
  grandOpening: {
    date: "2026-08-04",
    time: "5:00 PM",
    label: { en: "Grand Opening · August 4 · 5:00 PM", es: "Gran Apertura · 4 de agosto · 5:00 PM" },
  },
  ownerConfirmation: [
    "business hours",
    "parking and accessibility details",
    "service prices and deposits",
    "barber roster and biographies",
    "membership pricing and terms",
    "policies and legal text",
    "Square catalog and team mappings",
  ],
  accessibility: {
    en: "Contact the lounge before your visit for mobility, sensory, or communication accommodations.",
    es: "Comunícate con el salón antes de tu visita para solicitar adaptaciones de movilidad, sensoriales o de comunicación.",
  },
  contentStatus: "confirmed" as ContentStatus,
} as const;

export const hours: { day: Bi; weekday: number; open: string; close: string; closed?: boolean }[] = [
  { day: { en: "Sunday", es: "Domingo" }, weekday: 0, open: "", close: "", closed: true },
  { day: { en: "Monday", es: "Lunes" }, weekday: 1, open: "", close: "", closed: true },
  { day: { en: "Tuesday", es: "Martes" }, weekday: 2, open: "09:00", close: "19:00" },
  { day: { en: "Wednesday", es: "Miércoles" }, weekday: 3, open: "09:00", close: "19:00" },
  { day: { en: "Thursday", es: "Jueves" }, weekday: 4, open: "09:00", close: "20:00" },
  { day: { en: "Friday", es: "Viernes" }, weekday: 5, open: "09:00", close: "20:00" },
  { day: { en: "Saturday", es: "Sábado" }, weekday: 6, open: "08:00", close: "18:00" },
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
      en: "Precision shape, balanced weight, and clean finishing for every texture and length.",
      es: "Forma precisa, peso equilibrado y acabado limpio para toda textura y largo.",
    },
  },
  {
    slug: "beard-shaves",
    name: { en: "Beard & Shaves", es: "Barba y Afeitados" },
    description: {
      en: "Sculpting, conditioning, color refinement, and traditional hot-towel rituals.",
      es: "Diseño, acondicionamiento, color y rituales tradicionales con toalla caliente.",
    },
  },
  {
    slug: "color-texture",
    name: { en: "Color & Texture", es: "Color y Textura" },
    description: {
      en: "Controlled color, curl, smoothing, and texture services designed around your finish.",
      es: "Servicios de color, rizos, alisado y textura diseñados para tu acabado.",
    },
  },
  {
    slug: "hair-scalp-care",
    name: { en: "Hair & Scalp Care", es: "Cuidado Capilar" },
    description: {
      en: "Restorative cleansing, conditioning, scalp care, and capillary treatments.",
      es: "Limpieza restauradora, acondicionamiento, cuidado del cuero cabelludo y tratamientos capilares.",
    },
  },
  {
    slug: "grooming-finish",
    name: { en: "Grooming & Finish", es: "Arreglo y Acabado" },
    description: {
      en: "Detail work for brows, waxing, manicure grooming, and complete service packages.",
      es: "Detalles para cejas, depilación, manicura masculina y paquetes completos.",
    },
  },
  {
    slug: "youth-specialty",
    name: { en: "Youth & Specialty", es: "Juvenil y Especialidad" },
    description: {
      en: "Purpose-built services for young guests, military cuts, long hair, and special requests.",
      es: "Servicios para jóvenes, cortes militares, cabello largo y solicitudes especiales.",
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
  featured?: boolean;
  benefits: Bi[];
  preparation: Bi;
  maintenance: Bi;
  tags: string[];
  squareCatalogId?: string;
  contentStatus: ContentStatus;
};

const commonPreparation: Bi = {
  en: "Arrive with your hair in its normal condition and bring any reference images that clarify the result you want.",
  es: "Llega con el cabello en su condición normal y trae imágenes de referencia que aclaren el resultado que deseas.",
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
      { en: "Personal consultation before the service begins", es: "Consulta personal antes de comenzar" },
      { en: "Detailed finishing and styling guidance", es: "Acabado detallado y guía de estilo" },
    ],
    preparation: input.preparation ?? commonPreparation,
    maintenance: input.maintenance ?? {
      en: "Most guests rebook in two to four weeks, depending on the desired level of definition.",
      es: "La mayoría vuelve en dos a cuatro semanas, según el nivel de definición deseado.",
    },
    tags: input.tags ?? [],
    contentStatus: input.contentStatus ?? "curated-placeholder",
  };
}

/**
 * Curated launch catalog based on the supplied barber-service reference.
 * Prices are starting-price placeholders until the Square catalog is mapped.
 */
export const services: Service[] = [
  service({ slug: "signature-haircut", category: "haircuts-fades", name: { en: "Signature Haircut", es: "Corte Signature" }, blurb: { en: "Consultation, precision cut, rinse, styling, and a finish built for your routine.", es: "Consulta, corte de precisión, enjuague, peinado y acabado para tu rutina." }, description: { en: "A tailored haircut built around head shape, growth pattern, texture, and daily styling. The service includes a clear consultation, precision cutting, detailed neckline and perimeter work, and product guidance.", es: "Un corte personalizado según la forma de la cabeza, crecimiento, textura y rutina diaria. Incluye consulta, corte de precisión, detalles del contorno y guía de productos." }, minutes: 45, from: 45, deposit: 15, featured: true, tags: ["haircut", "custom cut", "scissor cut"] }),
  service({ slug: "fade-cut", category: "haircuts-fades", name: { en: "Fade Cut", es: "Corte Fade" }, blurb: { en: "A clean gradient with deliberate weight, crisp edges, and balanced shape.", es: "Un degradado limpio con peso deliberado, bordes precisos y forma equilibrada." }, description: { en: "Choose low, mid, high, taper, or skin fade. Your barber balances the fade with the top length and finishes the perimeter with exact detailing.", es: "Elige fade bajo, medio, alto, taper o skin fade. El barbero equilibra el degradado con la parte superior y termina el contorno con precisión." }, minutes: 45, from: 45, deposit: 15, featured: true, tags: ["fade", "skin fade", "taper"] }),
  service({ slug: "buzz-cut", category: "haircuts-fades", name: { en: "Buzz Cut", es: "Buzz Cut" }, blurb: { en: "Uniform clipper work, clean edges, and a polished low-maintenance finish.", es: "Máquina uniforme, bordes limpios y acabado pulido de bajo mantenimiento." }, description: { en: "A precise clipper cut using one or more guard lengths, with neckline and edge detailing for a clean, intentional result.", es: "Corte preciso con máquina usando uno o más números, con detalles en nuca y contorno." }, minutes: 25, from: 30, deposit: 10, tags: ["buzz cut", "clipper"] }),
  service({ slug: "custom-cut", category: "haircuts-fades", name: { en: "Custom Cut", es: "Corte Personalizado" }, blurb: { en: "A consultative cut for a new shape, image change, or complex reference.", es: "Un corte consultivo para nueva forma, cambio de imagen o referencia compleja." }, description: { en: "Designed for guests making a meaningful change. Extra consultation time allows the barber to plan shape, movement, texture, and maintenance before cutting.", es: "Diseñado para quienes buscan un cambio importante. El tiempo adicional permite planificar forma, movimiento, textura y mantenimiento." }, minutes: 60, from: 60, deposit: 20, tags: ["custom cut", "transformation"] }),
  service({ slug: "scissor-cut", category: "haircuts-fades", name: { en: "Scissor Cut", es: "Corte a Tijera" }, blurb: { en: "Classic scissor work for control, movement, and natural texture.", es: "Trabajo clásico a tijera para control, movimiento y textura natural." }, description: { en: "A scissor-led service for medium or longer styles, emphasizing natural movement, balanced layers, and polished shape.", es: "Servicio principalmente a tijera para estilos medios o largos, con movimiento natural, capas equilibradas y forma pulida." }, minutes: 50, from: 55, deposit: 15, tags: ["scissor cut", "long hair"] }),
  service({ slug: "razor-cut", category: "haircuts-fades", name: { en: "Razor Cut", es: "Corte con Navaja" }, blurb: { en: "Soft texture and controlled movement created with professional razor technique.", es: "Textura suave y movimiento controlado con técnica profesional de navaja." }, description: { en: "A texture-focused cutting service using a guarded professional razor where appropriate. Best for selected hair types and finishes after consultation.", es: "Servicio enfocado en textura usando navaja profesional protegida cuando corresponde. Ideal para ciertos tipos de cabello tras consulta." }, minutes: 50, from: 55, deposit: 15, tags: ["razor cut", "texture"] }),
  service({ slug: "hair-shape-up", category: "haircuts-fades", name: { en: "Hair Shape-Up", es: "Perfilado de Cabello" }, blurb: { en: "Crisp front, temple, and neckline detail between full services.", es: "Detalles precisos en frente, sienes y nuca entre servicios completos." }, description: { en: "A focused perimeter refresh that restores clean lines without changing the overall haircut.", es: "Retoque del contorno que recupera líneas limpias sin cambiar el corte completo." }, minutes: 20, from: 22, deposit: 8, tags: ["shape up", "lineup"] }),
  service({ slug: "head-shave", category: "beard-shaves", name: { en: "Head Shave", es: "Afeitado de Cabeza" }, blurb: { en: "Hot towels, close razor work, soothing finish, and polished detail.", es: "Toallas calientes, afeitado al ras, acabado calmante y detalle pulido." }, description: { en: "A traditional close head shave prepared with heat and finished with soothing post-shave care.", es: "Afeitado tradicional al ras preparado con calor y terminado con cuidado calmante." }, minutes: 40, from: 45, deposit: 15, tags: ["head shave", "hot towel"] }),
  service({ slug: "beard-trim", category: "beard-shaves", name: { en: "Beard Trim", es: "Recorte de Barba" }, blurb: { en: "Balanced length, clean perimeter, and a shape that supports the jaw.", es: "Largo equilibrado, contorno limpio y forma que favorece la mandíbula." }, description: { en: "A controlled beard trim with consultation, clipper or scissor shaping, neckline cleanup, and styling finish.", es: "Recorte controlado con consulta, forma a máquina o tijera, limpieza del cuello y acabado." }, minutes: 25, from: 28, deposit: 10, featured: true, tags: ["beard trim", "beard maintenance"] }),
  service({ slug: "beard-maintenance", category: "beard-shaves", name: { en: "Beard Maintenance", es: "Mantenimiento de Barba" }, blurb: { en: "Regular shape control, flyaway cleanup, neckline, and conditioning.", es: "Control regular de forma, limpieza, nuca y acondicionamiento." }, description: { en: "A maintenance visit for guests preserving an established beard shape between full sculpting sessions.", es: "Visita de mantenimiento para conservar una forma de barba ya establecida entre sesiones completas." }, minutes: 20, from: 24, deposit: 8, tags: ["beard maintenance"] }),
  service({ slug: "beard-conditioning", category: "beard-shaves", name: { en: "Beard Conditioning", es: "Acondicionamiento de Barba" }, blurb: { en: "Steam, cleansing, hydration, and a softer, healthier finish.", es: "Vapor, limpieza, hidratación y un acabado más suave y saludable." }, description: { en: "A restorative beard ritual using warm preparation, cleansing, conditioning, and finishing oil selected for the beard and skin.", es: "Ritual restaurador con preparación caliente, limpieza, acondicionamiento y aceite elegido para barba y piel." }, minutes: 25, from: 30, deposit: 10, tags: ["beard conditioning", "treatment"] }),
  service({ slug: "beard-dyeing", category: "beard-shaves", name: { en: "Beard Color Refinement", es: "Color de Barba" }, blurb: { en: "Subtle gray blending or fuller color with a natural-looking result.", es: "Mezcla sutil de canas o color completo con resultado natural." }, description: { en: "A consultation-led beard color service designed to soften gray, improve density appearance, or refine tone without an artificial finish.", es: "Servicio de color consultivo para suavizar canas, mejorar apariencia de densidad o refinar tono sin acabado artificial." }, minutes: 40, from: 45, deposit: 15, tags: ["beard dyeing", "color"] }),
  service({ slug: "hot-towel-shave", category: "beard-shaves", name: { en: "Hot Towel Shave", es: "Afeitado con Toalla Caliente" }, blurb: { en: "A traditional close shave with warm preparation and calming post-shave care.", es: "Afeitado tradicional al ras con preparación caliente y cuidado calmante." }, description: { en: "A classic barber ritual with multiple hot towels, lather, straight-razor work where appropriate, cool finish, and post-shave hydration.", es: "Ritual clásico con varias toallas calientes, espuma, navaja cuando corresponde, acabado frío e hidratación." }, minutes: 45, from: 50, deposit: 15, featured: true, tags: ["hot towel shave", "straight razor shave"] }),
  service({ slug: "straight-razor-shave", category: "beard-shaves", name: { en: "Straight Razor Shave", es: "Afeitado con Navaja" }, blurb: { en: "Precision razor work for the closest traditional finish.", es: "Trabajo preciso con navaja para el acabado tradicional más al ras." }, description: { en: "A close traditional shave performed after skin and hair preparation, with measured razor passes and a calming finish.", es: "Afeitado tradicional al ras tras preparar piel y vello, con pasadas controladas y acabado calmante." }, minutes: 40, from: 48, deposit: 15, tags: ["straight razor shave", "shave"] }),
  service({ slug: "hair-coloring", category: "color-texture", name: { en: "Hair Coloring", es: "Coloración de Cabello" }, blurb: { en: "Tone refinement, gray blending, or richer color planned through consultation.", es: "Refinamiento de tono, mezcla de canas o color más intenso mediante consulta." }, description: { en: "A customized color service priced after consultation according to hair length, density, product use, and desired result.", es: "Servicio de color personalizado cotizado tras consulta según largo, densidad, producto y resultado deseado." }, minutes: 75, from: 75, deposit: 25, tags: ["hair coloring", "gray blending"] }),
  service({ slug: "curly-hair", category: "color-texture", name: { en: "Curly Hair Design", es: "Diseño para Cabello Rizado" }, blurb: { en: "Shape and weight management created specifically for curls and coils.", es: "Forma y control de peso diseñados para rizos y cabello muy rizado." }, description: { en: "A texture-aware service focused on curl pattern, shrinkage, balance, and a practical styling routine.", es: "Servicio enfocado en patrón de rizo, encogimiento, equilibrio y rutina práctica de peinado." }, minutes: 60, from: 60, deposit: 20, tags: ["curly hair", "texture"] }),
  service({ slug: "hair-straightening", category: "color-texture", name: { en: "Hair Straightening", es: "Alisado de Cabello" }, blurb: { en: "Controlled smoothing and styling after a compatibility consultation.", es: "Alisado y peinado controlado tras consulta de compatibilidad." }, description: { en: "A consultation-required smoothing service. Technique, duration, and price depend on hair history, texture, length, and desired result.", es: "Servicio de alisado que requiere consulta. Técnica, duración y precio dependen del historial, textura, largo y resultado." }, minutes: 90, from: 95, deposit: 30, tags: ["hair straightening"] }),
  service({ slug: "perms", category: "color-texture", name: { en: "Texture Perm", es: "Permanente" }, blurb: { en: "Structured wave or curl created after condition and compatibility review.", es: "Ondas o rizos estructurados tras revisar condición y compatibilidad." }, description: { en: "A consultation-required texture service planned around hair integrity, desired curl size, and maintenance commitment.", es: "Servicio de textura que requiere consulta, planificado según integridad del cabello, tamaño del rizo y mantenimiento." }, minutes: 120, from: 120, deposit: 40, tags: ["perms", "texture"] }),
  service({ slug: "hair-extensions", category: "color-texture", name: { en: "Hair Extension Consultation", es: "Consulta de Extensiones" }, blurb: { en: "A private planning session for length, density, method, color, and maintenance.", es: "Sesión privada para planificar largo, densidad, método, color y mantenimiento." }, description: { en: "A consultation and suitability assessment. Final pricing is provided after method, quantity, color, and maintenance requirements are confirmed.", es: "Consulta y evaluación de compatibilidad. El precio final se entrega tras confirmar método, cantidad, color y mantenimiento." }, minutes: 30, from: 25, deposit: 25, tags: ["hair extensions", "consultation"] }),
  service({ slug: "shampoo-conditioning", category: "hair-scalp-care", name: { en: "Shampoo & Conditioning", es: "Champú y Acondicionamiento" }, blurb: { en: "Professional cleansing and conditioning selected for hair and scalp needs.", es: "Limpieza y acondicionamiento profesional según las necesidades del cabello y cuero cabelludo." }, description: { en: "A restorative cleanse and condition service that can stand alone or prepare the hair for another treatment.", es: "Limpieza y acondicionamiento restaurador que puede ser independiente o preparar el cabello para otro servicio." }, minutes: 20, from: 20, deposit: 5, tags: ["shampoo", "conditioning"] }),
  service({ slug: "scalp-treatment", category: "hair-scalp-care", name: { en: "Scalp Treatment", es: "Tratamiento del Cuero Cabelludo" }, blurb: { en: "Deep cleansing, exfoliation, hydration, and a calmer scalp feel.", es: "Limpieza profunda, exfoliación, hidratación y sensación de calma." }, description: { en: "A non-medical grooming treatment focused on cleansing product buildup and supporting a refreshed scalp environment. Persistent concerns should be discussed with a licensed healthcare professional.", es: "Tratamiento cosmético no médico para limpiar acumulación y refrescar el cuero cabelludo. Las molestias persistentes deben consultarse con un profesional de salud." }, minutes: 35, from: 40, deposit: 12, tags: ["scalp treatment", "care"] }),
  service({ slug: "capillary-hair-treatment", category: "hair-scalp-care", name: { en: "Capillary Hair Treatment", es: "Tratamiento Capilar" }, blurb: { en: "Condition-focused care to improve manageability, softness, and appearance.", es: "Cuidado enfocado en condición para mejorar manejo, suavidad y apariencia." }, description: { en: "A cosmetic conditioning treatment selected according to dryness, damage appearance, texture, and styling needs.", es: "Tratamiento cosmético elegido según resequedad, apariencia de daño, textura y necesidades de peinado." }, minutes: 45, from: 50, deposit: 15, tags: ["capillary treatment", "conditioning"] }),
  service({ slug: "eyebrow-trimming", category: "grooming-finish", name: { en: "Eyebrow Trimming", es: "Recorte de Cejas" }, blurb: { en: "Subtle cleanup that preserves a natural, masculine shape.", es: "Limpieza sutil que conserva una forma natural y masculina." }, description: { en: "A conservative trim and cleanup to reduce excess length and improve symmetry without over-shaping.", es: "Recorte conservador para reducir exceso de largo y mejorar simetría sin sobre-diseñar." }, minutes: 15, from: 15, deposit: 5, tags: ["eyebrow trimming"] }),
  service({ slug: "eyebrow-tinting", category: "grooming-finish", name: { en: "Eyebrow Tinting", es: "Tinte de Cejas" }, blurb: { en: "Controlled tone enhancement for stronger definition and balance.", es: "Mejora controlada del tono para mayor definición y equilibrio." }, description: { en: "A subtle tint service selected to complement natural hair and skin tone. Patch testing may be required.", es: "Tinte sutil elegido para complementar cabello y tono de piel. Puede requerir prueba de sensibilidad." }, minutes: 25, from: 28, deposit: 10, tags: ["eyebrow tinting"] }),
  service({ slug: "waxing", category: "grooming-finish", name: { en: "Facial Detail Waxing", es: "Depilación Facial" }, blurb: { en: "Clean detail work for brows, ears, nose, or selected facial areas.", es: "Detalles limpios para cejas, orejas, nariz o áreas faciales seleccionadas." }, description: { en: "Targeted facial waxing performed only on appropriate areas after a brief skin and sensitivity check.", es: "Depilación facial localizada en áreas apropiadas tras una breve revisión de piel y sensibilidad." }, minutes: 20, from: 18, deposit: 5, tags: ["waxing"] }),
  service({ slug: "mens-manicure", category: "grooming-finish", name: { en: "Men’s Manicure", es: "Manicura Masculina" }, blurb: { en: "Clean nails, refined cuticles, and a natural professional finish.", es: "Uñas limpias, cutículas cuidadas y acabado profesional natural." }, description: { en: "A discreet grooming service focused on trimming, shaping, cuticle care, and hydration without polish unless requested.", es: "Servicio discreto de corte, forma, cuidado de cutícula e hidratación, sin esmalte salvo solicitud." }, minutes: 35, from: 38, deposit: 12, tags: ["men's manicure"] }),
  service({ slug: "groom-package", category: "grooming-finish", name: { en: "Executive Grooming Package", es: "Paquete Ejecutivo" }, blurb: { en: "Haircut, beard detail, hot towel, cleansing, and a complete finishing ritual.", es: "Corte, detalle de barba, toalla caliente, limpieza y ritual completo de acabado." }, description: { en: "A complete sitting designed for guests who want the full lounge experience in one coordinated appointment.", es: "Sesión completa para quienes desean toda la experiencia del salón en una cita coordinada." }, minutes: 90, from: 105, deposit: 30, featured: true, tags: ["groom package", "executive"] }),
  service({ slug: "kids-cut", category: "youth-specialty", name: { en: "Young Gentleman’s Cut", es: "Corte para Niño" }, blurb: { en: "A patient, polished haircut for guests twelve and under.", es: "Corte paciente y pulido para clientes de doce años o menos." }, description: { en: "A youth haircut with clear communication, age-appropriate pacing, and the same finishing standard as an adult service.", es: "Corte juvenil con comunicación clara, ritmo apropiado y el mismo estándar de acabado." }, minutes: 30, from: 30, deposit: 10, tags: ["kids' cuts"] }),
  service({ slug: "military-haircut", category: "youth-specialty", name: { en: "Military Haircut", es: "Corte Militar" }, blurb: { en: "Disciplined clipper work with a clean, regulation-conscious finish.", es: "Trabajo disciplinado con máquina y acabado limpio, consciente de reglamentos." }, description: { en: "A precise short cut customized to the requested military or professional standard. Guests remain responsible for confirming exact organizational requirements.", es: "Corte corto preciso adaptado al estándar militar o profesional solicitado. El cliente debe confirmar requisitos específicos." }, minutes: 30, from: 32, deposit: 10, tags: ["military haircut"] }),
  service({ slug: "long-haircut", category: "youth-specialty", name: { en: "Long Haircut", es: "Corte de Cabello Largo" }, blurb: { en: "Shape, movement, and controlled weight for longer styles.", es: "Forma, movimiento y peso controlado para estilos largos." }, description: { en: "A longer appointment for scissor-led shaping, layers, perimeter refinement, and styling guidance.", es: "Cita más larga para forma a tijera, capas, contorno y guía de peinado." }, minutes: 65, from: 70, deposit: 20, tags: ["long haircut", "scissor"] }),
  service({ slug: "male-body-hair-removal", category: "youth-specialty", name: { en: "Men’s Body Grooming Consultation", es: "Consulta de Grooming Corporal" }, blurb: { en: "Private assessment for approved grooming areas and suitable methods.", es: "Evaluación privada de áreas aprobadas y métodos adecuados." }, description: { en: "A private consultation to determine the appropriate grooming approach and service scope.", es: "Una consulta privada para determinar el enfoque de grooming adecuado y el alcance del servicio." }, minutes: 20, from: 20, deposit: 10, tags: ["body grooming", "consultation"], contentStatus: "integration-required" }),
];

export const serviceAddOns = [
  { slug: "hot-towel", name: { en: "Hot Towel Finish", es: "Acabado con Toalla Caliente" }, minutes: 10, price: 12 },
  { slug: "beard-conditioning", name: { en: "Beard Conditioning", es: "Acondicionamiento de Barba" }, minutes: 15, price: 18 },
  { slug: "scalp-reset", name: { en: "Scalp Reset", es: "Renovación del Cuero Cabelludo" }, minutes: 20, price: 25 },
  { slug: "gray-blend", name: { en: "Gray Blend", es: "Mezcla de Canas" }, minutes: 25, price: 35 },
] as const;

export type Barber = {
  slug: string;
  name: string;
  title: Bi;
  bio: Bi;
  story: Bi;
  specialties: Bi;
  specialtyTags: string[];
  languages: string;
  initials: string;
  serviceSlugs: string[];
  image: {
    card: string;
    profile: string;
    profileAvif: string;
    mobile: string;
    alt: Bi;
    objectPosition: { card: string; profile: string; mobile: string };
  };
  identityStatus: "verified" | "temporary";
  availability: Bi;
  socialUrl?: string;
  squareTeamMemberId?: string;
  active: boolean;
  featured?: boolean;
  sortOrder: number;
  contentStatus: ContentStatus;
};

/**
 * Rubén's identity is verified from owner-supplied materials. The other names,
 * biographies, titles, and service mappings are polished temporary launch data
 * connected to the supplied real portraits. Replace them in this one array when
 * the owner approves the final roster. No credentials or years of experience are
 * claimed without verification.
 */
export const barbers: Barber[] = [
  {
    slug: "ruben-diaz-jr",
    name: "Rubén Díaz Jr.",
    initials: "RD",
    title: { en: "Founder & Lead Barber", es: "Fundador y Barbero Principal" },
    bio: {
      en: "A precision-focused barber shaping a lounge where consultation, craft, atmosphere, and personal attention receive equal care.",
      es: "Barbero enfocado en la precisión, creando un lounge donde consulta, oficio, ambiente y atención personal reciben el mismo cuidado.",
    },
    story: {
      en: "Rubén's chair is built around careful consultation, controlled detail, and a result designed to remain intentional beyond the first week.",
      es: "La silla de Rubén se basa en consulta cuidadosa, detalle controlado y un resultado diseñado para mantenerse intencional más allá de la primera semana.",
    },
    specialties: { en: "Precision fades · Beard architecture · Executive grooming", es: "Fades de precisión · Diseño de barba · Grooming ejecutivo" },
    specialtyTags: ["fade-cut", "beard-trim", "groom-package", "hot-towel-shave"],
    languages: "EN · ES",
    serviceSlugs: ["signature-haircut", "fade-cut", "beard-trim", "hot-towel-shave", "groom-package"],
    image: {
      card: "/media/barbers/cards/ruben-diaz-jr.webp",
      profile: "/media/barbers/profiles/ruben-diaz-jr.webp",
      profileAvif: "/media/barbers/profiles/ruben-diaz-jr.avif",
      mobile: "/media/barbers/mobile/ruben-diaz-jr.webp",
      alt: { en: "Rubén Díaz Jr. of Luxury Barber Lounge", es: "Rubén Díaz Jr. de Luxury Barber Lounge" },
      objectPosition: { card: "50% 24%", profile: "50% 22%", mobile: "50% 22%" },
    },
    identityStatus: "verified",
    availability: { en: "Appointments by availability", es: "Citas según disponibilidad" },
    active: true,
    featured: true,
    sortOrder: 1,
    contentStatus: "curated-placeholder",
  },
  {
    slug: "amaya-reyes",
    name: "Amaya Reyes",
    initials: "AR",
    title: { en: "Barber & Texture Specialist", es: "Barbera y Especialista en Textura" },
    bio: { en: "A composed, detail-led artist focused on polished shape, texture, and a finish that feels effortless to maintain.", es: "Artista serena y detallista enfocada en forma pulida, textura y un acabado fácil de mantener." },
    story: { en: "Amaya approaches each appointment through proportion, movement, and practical maintenance so the finished style feels personal rather than prescribed.", es: "Amaya aborda cada cita mediante proporción, movimiento y mantenimiento práctico para que el estilo final se sienta personal." },
    specialties: { en: "Scissor work · Texture shaping · Custom cuts", es: "Trabajo a tijera · Diseño de textura · Cortes personalizados" },
    specialtyTags: ["scissor-cut", "custom-cut", "curly-hair"],
    languages: "EN · ES",
    serviceSlugs: ["signature-haircut", "custom-cut", "scissor-cut", "curly-hair", "long-haircut"],
    image: { card: "/media/barbers/cards/amaya-reyes.webp", profile: "/media/barbers/profiles/amaya-reyes.webp", profileAvif: "/media/barbers/profiles/amaya-reyes.avif", mobile: "/media/barbers/mobile/amaya-reyes.webp", alt: { en: "Amaya Reyes of Luxury Barber Lounge", es: "Amaya Reyes de Luxury Barber Lounge" }, objectPosition: { card: "50% 20%", profile: "50% 18%", mobile: "50% 18%" } },
    identityStatus: "temporary",
    availability: { en: "Appointments by availability", es: "Citas según disponibilidad" },
    active: true,
    featured: true,
    sortOrder: 2,
    contentStatus: "curated-placeholder",
  },
  {
    slug: "adrian-cole",
    name: "Adrian Cole",
    initials: "AC",
    title: { en: "Senior Barber", es: "Barbero Senior" },
    bio: { en: "A calm, exacting barber with an eye for tailored silhouettes, clean transitions, and balanced beard structure.", es: "Barbero sereno y preciso con enfoque en siluetas personalizadas, transiciones limpias y barba equilibrada." },
    story: { en: "Adrian works from the complete silhouette backward, balancing structure and softness so each service suits the client beyond the chair.", es: "Adrian parte de la silueta completa, equilibrando estructura y suavidad para que cada servicio se adapte al cliente." },
    specialties: { en: "Executive cuts · Beard sculpting · Hot towel ritual", es: "Cortes ejecutivos · Diseño de barba · Ritual de toalla caliente" },
    specialtyTags: ["signature-haircut", "beard-trim", "hot-towel-shave"],
    languages: "EN",
    serviceSlugs: ["signature-haircut", "beard-trim", "beard-maintenance", "hot-towel-shave", "groom-package"],
    image: { card: "/media/barbers/cards/adrian-cole.webp", profile: "/media/barbers/profiles/adrian-cole.webp", profileAvif: "/media/barbers/profiles/adrian-cole.avif", mobile: "/media/barbers/mobile/adrian-cole.webp", alt: { en: "Adrian Cole of Luxury Barber Lounge", es: "Adrian Cole de Luxury Barber Lounge" }, objectPosition: { card: "50% 24%", profile: "50% 22%", mobile: "50% 22%" } },
    identityStatus: "temporary",
    availability: { en: "Appointments by availability", es: "Citas según disponibilidad" },
    active: true,
    featured: true,
    sortOrder: 3,
    contentStatus: "curated-placeholder",
  },
  {
    slug: "mateo-cruz",
    name: "Mateo Cruz",
    initials: "MC",
    title: { en: "Fade & Detail Barber", es: "Barbero de Fades y Detalle" },
    bio: { en: "A focused barber known for sharp gradients, clean line work, and a modern finish without unnecessary excess.", es: "Barbero enfocado en degradados precisos, líneas limpias y un acabado moderno sin excesos." },
    story: { en: "Mateo prioritizes a clear consultation and disciplined technical work, then refines the final shape around the client's routine.", es: "Mateo prioriza una consulta clara y trabajo técnico disciplinado, refinando la forma final según la rutina del cliente." },
    specialties: { en: "Skin fades · Lineups · Beard maintenance", es: "Skin fades · Perfilados · Mantenimiento de barba" },
    specialtyTags: ["fade-cut", "hair-shape-up", "beard-maintenance"],
    languages: "EN · ES",
    serviceSlugs: ["fade-cut", "hair-shape-up", "beard-trim", "beard-maintenance", "kids-cut"],
    image: { card: "/media/barbers/cards/mateo-cruz.webp", profile: "/media/barbers/profiles/mateo-cruz.webp", profileAvif: "/media/barbers/profiles/mateo-cruz.avif", mobile: "/media/barbers/mobile/mateo-cruz.webp", alt: { en: "Mateo Cruz of Luxury Barber Lounge", es: "Mateo Cruz de Luxury Barber Lounge" }, objectPosition: { card: "50% 18%", profile: "50% 18%", mobile: "50% 18%" } },
    identityStatus: "temporary",
    availability: { en: "Appointments by availability", es: "Citas según disponibilidad" },
    active: true,
    sortOrder: 4,
    contentStatus: "curated-placeholder",
  },
  {
    slug: "julian-vega",
    name: "Julian Vega",
    initials: "JV",
    title: { en: "Precision Barber", es: "Barbero de Precisión" },
    bio: { en: "A technical barber balancing crisp clipper work with natural texture and understated finishing.", es: "Barbero técnico que equilibra máquina precisa, textura natural y acabado sobrio." },
    story: { en: "Julian builds clean structure first, then softens the finish where needed so the result reads polished rather than overworked.", es: "Julian construye una estructura limpia y suaviza el acabado donde corresponde para un resultado pulido." },
    specialties: { en: "Tapers · Texture control · Razor detail", es: "Tapers · Control de textura · Detalle con navaja" },
    specialtyTags: ["fade-cut", "razor-cut", "hair-shape-up"],
    languages: "EN · ES",
    serviceSlugs: ["signature-haircut", "fade-cut", "razor-cut", "hair-shape-up", "beard-trim"],
    image: { card: "/media/barbers/cards/julian-vega.webp", profile: "/media/barbers/profiles/julian-vega.webp", profileAvif: "/media/barbers/profiles/julian-vega.avif", mobile: "/media/barbers/mobile/julian-vega.webp", alt: { en: "Julian Vega of Luxury Barber Lounge", es: "Julian Vega de Luxury Barber Lounge" }, objectPosition: { card: "50% 18%", profile: "50% 18%", mobile: "50% 18%" } },
    identityStatus: "temporary",
    availability: { en: "Appointments by availability", es: "Citas según disponibilidad" },
    active: true,
    sortOrder: 5,
    contentStatus: "curated-placeholder",
  },
  {
    slug: "elias-moreno",
    name: "Elias Moreno",
    initials: "EM",
    title: { en: "Contemporary Barber", es: "Barbero Contemporáneo" },
    bio: { en: "A modern barber focused on wearable shape, clean edges, and relaxed styling for everyday confidence.", es: "Barbero moderno enfocado en forma llevable, bordes limpios y estilo relajado para confianza diaria." },
    story: { en: "Elias keeps the consultation direct and translates references into a finish that works with natural growth and daily styling habits.", es: "Elias mantiene una consulta directa y adapta referencias al crecimiento natural y los hábitos diarios." },
    specialties: { en: "Modern cuts · Shape-ups · Styling", es: "Cortes modernos · Perfilados · Peinado" },
    specialtyTags: ["custom-cut", "hair-shape-up", "signature-haircut"],
    languages: "EN · ES",
    serviceSlugs: ["signature-haircut", "custom-cut", "hair-shape-up", "fade-cut", "kids-cut"],
    image: { card: "/media/barbers/cards/elias-moreno.webp", profile: "/media/barbers/profiles/elias-moreno.webp", profileAvif: "/media/barbers/profiles/elias-moreno.avif", mobile: "/media/barbers/mobile/elias-moreno.webp", alt: { en: "Elias Moreno of Luxury Barber Lounge", es: "Elias Moreno de Luxury Barber Lounge" }, objectPosition: { card: "50% 16%", profile: "50% 16%", mobile: "50% 16%" } },
    identityStatus: "temporary",
    availability: { en: "Appointments by availability", es: "Citas según disponibilidad" },
    active: true,
    sortOrder: 6,
    contentStatus: "curated-placeholder",
  },
  {
    slug: "nico-santos",
    name: "Nico Santos",
    initials: "NS",
    title: { en: "Barber", es: "Barbero" },
    bio: { en: "A clean, contemporary barber focused on balanced fades, polished outlines, and approachable service.", es: "Barbero contemporáneo enfocado en fades equilibrados, contornos pulidos y servicio cercano." },
    story: { en: "Nico favors clear visual references, measured transitions, and a finish designed to remain easy to manage between visits.", es: "Nico favorece referencias claras, transiciones medidas y un acabado fácil de mantener entre visitas." },
    specialties: { en: "Mid fades · Tapers · Clean outlines", es: "Fades medios · Tapers · Contornos limpios" },
    specialtyTags: ["fade-cut", "hair-shape-up", "buzz-cut"],
    languages: "EN · ES",
    serviceSlugs: ["fade-cut", "signature-haircut", "hair-shape-up", "buzz-cut", "beard-trim"],
    image: { card: "/media/barbers/cards/nico-santos.webp", profile: "/media/barbers/profiles/nico-santos.webp", profileAvif: "/media/barbers/profiles/nico-santos.avif", mobile: "/media/barbers/mobile/nico-santos.webp", alt: { en: "Nico Santos of Luxury Barber Lounge", es: "Nico Santos de Luxury Barber Lounge" }, objectPosition: { card: "50% 18%", profile: "50% 18%", mobile: "50% 18%" } },
    identityStatus: "temporary",
    availability: { en: "Appointments by availability", es: "Citas según disponibilidad" },
    active: true,
    sortOrder: 7,
    contentStatus: "curated-placeholder",
  },
  {
    slug: "marcus-bennett",
    name: "Marcus Bennett",
    initials: "MB",
    title: { en: "Classic Grooming Barber", es: "Barbero de Grooming Clásico" },
    bio: { en: "A measured barber bringing structure, comfort, and classic grooming discipline to every appointment.", es: "Barbero metódico que aporta estructura, comodidad y disciplina clásica a cada cita." },
    story: { en: "Marcus centers the experience on consistency: a clear plan, composed service, and a finish that remains dependable between visits.", es: "Marcus centra la experiencia en consistencia: plan claro, servicio sereno y acabado confiable entre visitas." },
    specialties: { en: "Classic cuts · Beard shape · Hot towel care", es: "Cortes clásicos · Forma de barba · Cuidado con toalla caliente" },
    specialtyTags: ["signature-haircut", "beard-trim", "hot-towel-shave"],
    languages: "EN",
    serviceSlugs: ["signature-haircut", "scissor-cut", "beard-trim", "beard-conditioning", "hot-towel-shave"],
    image: { card: "/media/barbers/cards/marcus-bennett.webp", profile: "/media/barbers/profiles/marcus-bennett.webp", profileAvif: "/media/barbers/profiles/marcus-bennett.avif", mobile: "/media/barbers/mobile/marcus-bennett.webp", alt: { en: "Marcus Bennett of Luxury Barber Lounge", es: "Marcus Bennett de Luxury Barber Lounge" }, objectPosition: { card: "50% 20%", profile: "50% 20%", mobile: "50% 20%" } },
    identityStatus: "temporary",
    availability: { en: "Appointments by availability", es: "Citas según disponibilidad" },
    active: true,
    sortOrder: 8,
    contentStatus: "curated-placeholder",
  },
  {
    slug: "andre-silva",
    name: "Andre Silva",
    initials: "AS",
    title: { en: "Beard & Finish Barber", es: "Barbero de Barba y Acabado" },
    bio: { en: "A personable barber focused on beard balance, clean finishing, and a relaxed premium service experience.", es: "Barbero cercano enfocado en equilibrio de barba, acabado limpio y una experiencia premium relajada." },
    story: { en: "Andre uses proportion and clean perimeter work to create results that frame the face naturally and remain easy to maintain.", es: "Andre usa proporción y contorno limpio para crear resultados naturales y fáciles de mantener." },
    specialties: { en: "Beard sculpting · Tapers · Finishing rituals", es: "Diseño de barba · Tapers · Rituales de acabado" },
    specialtyTags: ["beard-trim", "beard-maintenance", "fade-cut"],
    languages: "EN · ES",
    serviceSlugs: ["beard-trim", "beard-maintenance", "beard-conditioning", "fade-cut", "groom-package"],
    image: { card: "/media/barbers/cards/andre-silva.webp", profile: "/media/barbers/profiles/andre-silva.webp", profileAvif: "/media/barbers/profiles/andre-silva.avif", mobile: "/media/barbers/mobile/andre-silva.webp", alt: { en: "Andre Silva of Luxury Barber Lounge", es: "Andre Silva de Luxury Barber Lounge" }, objectPosition: { card: "50% 16%", profile: "50% 16%", mobile: "50% 16%" } },
    identityStatus: "temporary",
    availability: { en: "Appointments by availability", es: "Citas según disponibilidad" },
    active: true,
    sortOrder: 9,
    contentStatus: "curated-placeholder",
  },
];

export type Tier = {
  slug: string;
  name: Bi;
  price: number;
  cadence: Bi;
  description: Bi;
  perks: Bi[];
  featured?: boolean;
  contentStatus: ContentStatus;
};

export const tiers: Tier[] = [
  {
    slug: "the-standing",
    name: { en: "The Standing", es: "La Fija" },
    price: 65,
    cadence: { en: "per month", es: "al mes" },
    description: { en: "A reliable monthly reset with a preferred booking rhythm.", es: "Un mantenimiento mensual confiable con ritmo de reserva preferente." },
    perks: [
      { en: "One signature haircut each month", es: "Un corte signature cada mes" },
      { en: "Priority rebooking window", es: "Ventana prioritaria para volver a reservar" },
      { en: "10% off eligible retail", es: "10% de descuento en productos elegibles" },
    ],
    contentStatus: "curated-placeholder",
  },
  {
    slug: "the-fortnight",
    name: { en: "The Fortnight", es: "La Quincenal" },
    price: 110,
    cadence: { en: "per month", es: "al mes" },
    description: { en: "For guests who keep their shape crisp every other week.", es: "Para quienes mantienen su forma impecable cada dos semanas." },
    perks: [
      { en: "Two eligible haircuts each month", es: "Dos cortes elegibles cada mes" },
      { en: "Complimentary beard tidy between visits", es: "Retoque de barba de cortesía entre visitas" },
      { en: "Priority booking window", es: "Ventana de reserva prioritaria" },
      { en: "15% off eligible retail", es: "15% de descuento en productos elegibles" },
    ],
    featured: true,
    contentStatus: "curated-placeholder",
  },
  {
    slug: "the-lounge",
    name: { en: "The Lounge", es: "La Lounge" },
    price: 190,
    cadence: { en: "per month", es: "al mes" },
    description: { en: "A concierge-style grooming rhythm for high-frequency maintenance.", es: "Un ritmo de grooming tipo concierge para mantenimiento frecuente." },
    perks: [
      { en: "Expanded monthly service allowance", es: "Asignación mensual ampliada de servicios" },
      { en: "After-hours request priority", es: "Prioridad para solicitudes fuera de horario" },
      { en: "One guest benefit each month", es: "Un beneficio para invitado cada mes" },
      { en: "20% off eligible retail", es: "20% de descuento en productos elegibles" },
    ],
    contentStatus: "curated-placeholder",
  },
];

export const packages = [
  { slug: "executive-reset", name: { en: "Executive Reset", es: "Renovación Ejecutiva" }, description: { en: "Signature haircut, beard sculpt, hot towel, shampoo, and styling consultation.", es: "Corte signature, diseño de barba, toalla caliente, champú y consulta de peinado." }, minutes: 105, from: 125 },
  { slug: "hair-beard", name: { en: "Hair & Beard Ritual", es: "Ritual de Cabello y Barba" }, description: { en: "A coordinated haircut and beard service with conditioning and finishing.", es: "Corte y barba coordinados con acondicionamiento y acabado." }, minutes: 75, from: 85 },
  { slug: "father-son", name: { en: "Father & Son", es: "Padre e Hijo" }, description: { en: "Two coordinated appointments with age-appropriate service and shared lounge time.", es: "Dos citas coordinadas con servicio apropiado para cada edad y tiempo compartido." }, minutes: 90, from: 90 },
  { slug: "wedding-grooming", name: { en: "Wedding Grooming", es: "Grooming para Boda" }, description: { en: "Consultation, trial schedule, event-week services, and group coordination.", es: "Consulta, prueba, servicios de la semana del evento y coordinación de grupo." }, minutes: 120, from: 175 },
  { slug: "vip-after-hours", name: { en: "VIP After Hours", es: "VIP Fuera de Horario" }, description: { en: "A private request-based appointment outside standard hours, subject to approval.", es: "Cita privada fuera del horario regular, sujeta a aprobación." }, minutes: 90, from: 185 },
] as const;

export const faqs: { question: Bi; answer: Bi; category: string }[] = [
  { category: "booking", question: { en: "Do you accept walk-ins?", es: "¿Aceptan clientes sin cita?" }, answer: { en: "Yes, when capacity allows. Appointments receive priority, and the digital queue will show the current status once activated.", es: "Sí, cuando la capacidad lo permite. Las citas tienen prioridad y la fila digital mostrará el estado cuando esté activa." } },
  { category: "booking", question: { en: "Is a deposit required?", es: "¿Se requiere depósito?" }, answer: { en: "Selected services require a deposit that is applied to the final total. The exact amount appears before confirmation.", es: "Algunos servicios requieren depósito que se aplica al total final. El monto exacto aparece antes de confirmar." } },
  { category: "booking", question: { en: "How early should I arrive?", es: "¿Con cuánta anticipación debo llegar?" }, answer: { en: "Arrive five to ten minutes early for check-in and consultation, especially for a first visit.", es: "Llega de cinco a diez minutos antes para registrarte y consultar, especialmente en tu primera visita." } },
  { category: "services", question: { en: "Can you help me choose a service?", es: "¿Pueden ayudarme a elegir un servicio?" }, answer: { en: "Yes. Choose the closest service and add a note, or use the concierge to receive a rules-based recommendation.", es: "Sí. Elige el servicio más cercano y agrega una nota, o usa el concierge para una recomendación basada en reglas." } },
  { category: "services", question: { en: "Do you work with curly or longer hair?", es: "¿Trabajan con cabello rizado o largo?" }, answer: { en: "Yes. Select the dedicated curly-hair or long-hair service so enough time is reserved.", es: "Sí. Elige el servicio para cabello rizado o largo para reservar suficiente tiempo." } },
  { category: "policies", question: { en: "What is the cancellation policy?", es: "¿Cuál es la política de cancelación?" }, answer: { en: "Please change or cancel within the window shown during booking. Late changes and no-shows may affect the deposit or incur a fee.", es: "Cambia o cancela dentro del plazo mostrado al reservar. Cambios tardíos y ausencias pueden afectar el depósito o generar cargo." } },
  { category: "membership", question: { en: "Are memberships active now?", es: "¿Las membresías están activas?" }, answer: { en: "Membership architecture is ready, but billing and final benefits remain feature-flagged until owner and Square approval.", es: "La arquitectura está lista, pero la facturación y beneficios finales permanecen desactivados hasta aprobación del propietario y Square." } },
  { category: "accessibility", question: { en: "Can I request an accommodation?", es: "¿Puedo solicitar una adaptación?" }, answer: { en: "Yes. Contact the lounge before your appointment so the team can prepare reasonable mobility, sensory, or communication support.", es: "Sí. Comunícate antes de tu cita para que el equipo prepare apoyo razonable de movilidad, sensorial o comunicación." } },
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
    lead: { en: "Precision cuts, beard rituals, color, texture, and detailed grooming, organized around the result you want.", es: "Cortes de precisión, rituales de barba, color, textura y grooming detallado según el resultado que deseas." },
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
    note: { en: "Plans shown are curated launch proposals. Billing remains disabled until final owner and Square approval.", es: "Los planes mostrados son propuestas de lanzamiento. La facturación permanece desactivada hasta aprobación final." },
  },
  visit: {
    eyebrow: { en: "Northfield, New Jersey", es: "Northfield, Nueva Jersey" },
    title: { en: "Visit the Lounge", es: "Visita el Salón" },
    lead: { en: "Suite 106 on Tilton Road, with complimentary parking directly outside.", es: "Suite 106 en Tilton Road, con estacionamiento gratuito justo afuera." },
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
  const resolved = slug === "ruben" ? "ruben-diaz-jr" : slug;
  return barbers.find((item) => item.slug === resolved);
}

export function findJournalPost(slug: string) {
  return journalPosts.find((item) => item.slug === slug);
}
