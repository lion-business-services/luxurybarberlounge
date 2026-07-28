import type { Bi } from "./site";

export type ContentState = "confirmed" | "demo" | "pending-integration";

export const testimonials = [
  {
    id: "review-1",
    name: "Launch Guest",
    rating: 5,
    service: "Signature Haircut",
    quote: {
      en: "Demo testimonial placeholder. Replace with a verified client review before enabling review structured data.",
      es: "Testimonio de demostración. Reemplázalo con una reseña verificada antes de activar datos estructurados.",
    },
    state: "demo" as ContentState,
  },
  {
    id: "review-2",
    name: "Founding Member",
    rating: 5,
    service: "Hair & Beard Ritual",
    quote: {
      en: "Demo testimonial placeholder emphasizing consultation, detail, and an unhurried experience.",
      es: "Testimonio de demostración que destaca consulta, detalle y una experiencia sin prisa.",
    },
    state: "demo" as ContentState,
  },
  {
    id: "review-3",
    name: "First Visit Guest",
    rating: 5,
    service: "Fade Cut",
    quote: {
      en: "Demo testimonial placeholder for layout and content-management review only.",
      es: "Testimonio de demostración solo para revisar diseño y administración de contenido.",
    },
    state: "demo" as ContentState,
  },
] as const;

export const galleryItems = [
  { id: "lounge-wall", src: "/hero/lounge-wall.webp", title: { en: "The Lounge", es: "El Salón" }, category: "interior", alt: { en: "Luxury barber lounge with black walls and gold details", es: "Barbería de lujo con paredes negras y detalles dorados" } },
  { id: "lounge-chair", src: "/hero/lounge-chair.webp", title: { en: "The Chair", es: "La Silla" }, category: "interior", alt: { en: "Premium barber chair in a dark luxury lounge", es: "Silla de barbero premium en un salón oscuro de lujo" } },
  { id: "craft-tools", src: "/hero/craft-tools.webp", title: { en: "The Tools", es: "Las Herramientas" }, category: "craft", alt: { en: "Professional barber tools arranged for a craftsmanship scene", es: "Herramientas profesionales de barbería en una escena de oficio" } },
  { id: "mirror-station", src: "/hero/mirror-station.webp", title: { en: "The Mirror", es: "El Espejo" }, category: "interior", alt: { en: "Gold-framed barber mirror and grooming station", es: "Espejo dorado y estación de grooming" } },
  { id: "scene-advance", src: "/hero/scene-advance.webp", title: { en: "The Experience", es: "La Experiencia" }, category: "brand", alt: { en: "Cinematic barber lounge scene with chair and tools", es: "Escena cinematográfica con silla y herramientas" } },
  { id: "crest-reveal", src: "/hero/crest-reveal-poster.webp", title: { en: "The Crest", es: "El Escudo" }, category: "brand", alt: { en: "Luxury Barber Lounge crest reveal artwork", es: "Escudo de Luxury Barber Lounge" } },
] as const;

export const eventOffers = [
  {
    slug: "wedding-grooming",
    title: { en: "Wedding Grooming", es: "Grooming para Boda" },
    copy: { en: "Consultation, trial planning, event-week services, and coordinated timing for the groom and party.", es: "Consulta, planificación de prueba, servicios de la semana del evento y horarios coordinados." },
    bullets: { en: ["Private consultation", "Trial appointment plan", "Group schedule coordination", "On-location request review"], es: ["Consulta privada", "Plan de cita de prueba", "Coordinación del grupo", "Evaluación de servicio a domicilio"] },
  },
  {
    slug: "corporate-grooming",
    title: { en: "Corporate & Editorial", es: "Corporativo y Editorial" },
    copy: { en: "Prepared grooming for headshots, launches, productions, and executive events.", es: "Grooming preparado para retratos, lanzamientos, producciones y eventos ejecutivos." },
    bullets: { en: ["Individual or group scheduling", "Production-day timing", "Invoice-ready quote", "Brand-consistent finishing"], es: ["Horarios individuales o grupales", "Coordinación del día de producción", "Cotización lista para factura", "Acabado coherente con la marca"] },
  },
  {
    slug: "private-lounge",
    title: { en: "Private Lounge Experience", es: "Experiencia Privada" },
    copy: { en: "A request-based private block for celebrations, teams, and hosted grooming experiences.", es: "Bloque privado por solicitud para celebraciones, equipos y experiencias de grooming." },
    bullets: { en: ["Dedicated time block", "Custom service menu", "Hospitality add-ons", "Deposit and guest-count terms"], es: ["Bloque de tiempo dedicado", "Menú personalizado", "Opciones de hospitalidad", "Términos de depósito e invitados"] },
  },
] as const;

export const products = [
  { slug: "matte-styling-clay", name: { en: "Matte Styling Clay", es: "Arcilla Mate" }, category: "Styling", price: 24, copy: { en: "Firm, workable control with a low-shine finish.", es: "Control firme y flexible con acabado de poco brillo." }, state: "demo" as ContentState },
  { slug: "beard-conditioning-oil", name: { en: "Beard Conditioning Oil", es: "Aceite para Barba" }, category: "Beard", price: 22, copy: { en: "Lightweight conditioning for beard softness and skin comfort.", es: "Acondicionamiento ligero para suavidad y confort de la piel." }, state: "demo" as ContentState },
  { slug: "daily-scalp-cleanser", name: { en: "Daily Scalp Cleanser", es: "Limpiador Capilar Diario" }, category: "Hair care", price: 26, copy: { en: "Balanced cleansing intended for regular grooming routines.", es: "Limpieza equilibrada para rutinas regulares." }, state: "demo" as ContentState },
  { slug: "travel-grooming-kit", name: { en: "Travel Grooming Kit", es: "Kit de Viaje" }, category: "Gift set", price: 58, copy: { en: "A compact care set for polished maintenance between appointments.", es: "Kit compacto para mantenimiento entre citas." }, state: "demo" as ContentState },
] as const;

export const careerRoles = [
  { title: "Licensed Barber", type: "Chair opportunity", copy: "For a client-focused professional with strong consultation, service, and portfolio standards.", requirements: ["Active license where required", "Portfolio or social work samples", "Availability and service specialties", "Professional references"] },
  { title: "Guest Experience Coordinator", type: "Front desk", copy: "For a composed operator who can manage check-in, queue flow, appointments, and guest communication.", requirements: ["Hospitality or scheduling experience", "Clear written and spoken communication", "Comfort with booking software", "Weekend availability"] },
  { title: "Barber Apprentice", type: "Development", copy: "A supervised growth opportunity subject to licensing rules, mentor capacity, and business approval.", requirements: ["Training status documentation", "Availability", "Portfolio or practice work", "Commitment to service standards"] },
] as const;

export const policies: Record<string, { title: string; intro: string; sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }> }> = {
  booking: {
    title: "Booking Policy",
    intro: "These curated launch terms should be reviewed by ownership and counsel before final publication.",
    sections: [
      { heading: "Reservation accuracy", paragraphs: ["Guests should select the service that most closely matches the requested result. If additional time or a different service is required, the lounge may recommend an adjustment before confirmation."] },
      { heading: "Confirmation", paragraphs: ["A request is not a confirmed appointment until the guest receives an approved booking confirmation through the active booking system or directly from the lounge."] },
      { heading: "Arrival", paragraphs: ["First-time guests should arrive five to ten minutes early for check-in and consultation. Arriving late may reduce available service time or require rescheduling."] },
    ],
  },
  cancellation: {
    title: "Cancellation & Rescheduling Policy",
    intro: "The final cancellation window and fees must match the settings approved in Square.",
    sections: [
      { heading: "Advance changes", paragraphs: ["Please cancel or reschedule within the notice window displayed during booking. This protects reserved chair time and gives another guest a fair opportunity to book."] },
      { heading: "Late changes", paragraphs: ["Changes made after the approved window may result in loss of deposit or a fee, subject to the confirmed booking terms."] },
      { heading: "Emergencies", paragraphs: ["Contact the lounge as soon as possible. Management may review genuine emergencies case by case without guaranteeing a waiver."] },
    ],
  },
  deposits: {
    title: "Deposit Policy",
    intro: "Deposits remain disabled until Square configuration and owner approval are complete.",
    sections: [
      { heading: "Purpose", paragraphs: ["Selected appointments may require a deposit to reserve time, products, or extended service capacity."] },
      { heading: "Application", paragraphs: ["An accepted deposit is applied to the eligible final service total unless the confirmed cancellation or no-show terms state otherwise."] },
      { heading: "Payment security", paragraphs: ["Payment information is processed by the approved payment provider. Luxury Barber Lounge does not store raw card data in Supabase or the website application."] },
    ],
  },
  noShow: {
    title: "No-Show & Late Arrival Policy",
    intro: "The final fee amount and grace period must be confirmed before live enforcement.",
    sections: [
      { heading: "Late arrival", paragraphs: ["The lounge will make a reasonable effort to preserve the appointment, but the service may be shortened, adjusted, or rescheduled if completing it would affect later guests."] },
      { heading: "No-show", paragraphs: ["Failure to arrive without notice may result in loss of deposit, a fee, or a requirement to prepay a future appointment, subject to the approved booking terms."] },
      { heading: "Repeated incidents", paragraphs: ["Management may restrict online booking for repeated late cancellations or no-shows and offer direct booking assistance instead."] },
    ],
  },
  refund: {
    title: "Refund Policy",
    intro: "Service and retail refund terms should be reviewed before activation.",
    sections: [
      { heading: "Service concerns", paragraphs: ["Contact the lounge promptly if a service concern arises. Management may offer an assessment, reasonable correction, account credit, or another resolution based on the circumstances."] },
      { heading: "Retail products", paragraphs: ["Unopened eligible products may be considered for return within the posted period. Used personal-care products are generally not returnable for hygiene reasons unless defective."] },
      { heading: "Provider records", paragraphs: ["Approved refunds are processed through the original payment provider when possible and may take additional banking time to appear."] },
    ],
  },
  membership: {
    title: "Membership Terms",
    intro: "Membership billing is feature-flagged and these terms are a launch draft only.",
    sections: [
      { heading: "Benefits", paragraphs: ["Benefits, eligible services, discounts, and usage limits are defined by the active plan shown at enrollment."] },
      { heading: "Billing", paragraphs: ["Membership charges will not begin until live billing is activated and the guest completes an approved enrollment flow."] },
      { heading: "Changes and cancellation", paragraphs: ["Notice requirements, pauses, rollover, and cancellation rules will be presented before enrollment and preserved with the membership record."] },
    ],
  },
};

export const legalContent = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      { heading: "Information we collect", paragraphs: ["We may collect contact information, booking details, voluntarily supplied grooming preferences, consent records, and technical information needed to operate the website and services."], bullets: ["Name, email, and phone", "Appointment and queue data", "Communication preferences", "Optional grooming notes and reference images", "Security and audit information"] },
      { heading: "How information is used", paragraphs: ["Information is used to provide services, manage appointments, communicate transactional updates, improve operations, and send marketing only where permitted."] },
      { heading: "Service providers", paragraphs: ["Approved providers may include Square, Supabase, email and SMS processors, hosting, monitoring, and analytics services. Each provider receives only the information reasonably required for its role."] },
      { heading: "Choices and requests", paragraphs: ["Guests may request access, correction, export, or deletion subject to legal, security, and record-retention obligations. Marketing preferences can be changed separately from required transactional messages."] },
    ],
  },
  terms: {
    title: "Website Terms",
    sections: [
      { heading: "Website use", paragraphs: ["The website provides business information, booking assistance, and account features. Users must not misuse the service, interfere with security, or attempt unauthorized access."] },
      { heading: "Pricing and availability", paragraphs: ["Prices, durations, benefits, and availability may change. A displayed time or price is not final unless confirmed by the active booking and payment system."] },
      { heading: "Intellectual property", paragraphs: ["Brand assets, original copy, designs, and software are protected and may not be reproduced without authorization."] },
      { heading: "Limitations", paragraphs: ["The website is provided with reasonable care but may experience maintenance, provider outages, or data delays. Nothing on the site constitutes medical, legal, or financial advice."] },
    ],
  },
  sms: {
    title: "SMS Terms",
    sections: [
      { heading: "Consent", paragraphs: ["By opting in, a guest authorizes messages related to appointments, queue status, account activity, and separate marketing where expressly selected. Consent is not a condition of purchase."] },
      { heading: "Frequency and charges", paragraphs: ["Message frequency varies. Message and data rates may apply according to the guest’s mobile plan."] },
      { heading: "Opting out", paragraphs: ["Reply STOP to end optional SMS messages. Transactional or safety-related communication may continue through another channel where necessary to fulfill a request."] },
      { heading: "Help", paragraphs: ["Reply HELP or contact the lounge using the information shown on the website."] },
    ],
  },
  accessibility: {
    title: "Accessibility Statement",
    sections: [
      { heading: "Commitment", paragraphs: ["Luxury Barber Lounge aims to provide a website and in-person experience that is usable by people with diverse abilities and access needs."] },
      { heading: "Digital measures", paragraphs: ["The site uses semantic structure, keyboard-accessible controls, visible focus, reduced-motion support, text alternatives, and responsive layouts as part of an ongoing accessibility program."] },
      { heading: "Assistance", paragraphs: ["Contact the lounge if a digital feature is difficult to use or an in-person accommodation is needed. Include the page, feature, or requested support so the team can respond effectively."] },
    ],
  },
  cookies: {
    title: "Cookie Preferences",
    sections: [
      { heading: "Essential technologies", paragraphs: ["Essential storage may be used for language, security, session, and account functionality."] },
      { heading: "Analytics and advertising", paragraphs: ["Optional analytics and advertising technologies remain disabled until configured and, where required, consent is obtained."] },
      { heading: "Managing preferences", paragraphs: ["A production consent manager can be activated when optional tracking providers are enabled. Until then, the platform does not load optional marketing pixels by default."] },
    ],
  },
};

export const portalDemo = {
  client: {
    metrics: [
      { label: "Next appointment", value: "Sat · 10:30 AM", note: "Signature Haircut · Carlos" },
      { label: "Membership", value: "Not active", note: "Compare launch plans" },
      { label: "Rewards", value: "120 pts", note: "Demo ledger" },
      { label: "Next maintenance", value: "3 weeks", note: "Based on last service" },
    ],
    appointments: [
      { date: "Aug 8, 2026", service: "Signature Haircut", barber: "Carlos", status: "Confirmed", total: "$45" },
      { date: "Jul 11, 2026", service: "Fade Cut", barber: "Ruben", status: "Completed", total: "$45" },
      { date: "Jun 14, 2026", service: "Hair & Beard Ritual", barber: "Ruben", status: "Completed", total: "$85" },
    ],
  },
  barber: {
    metrics: [
      { label: "Today", value: "7 guests", note: "5 booked · 2 walk-ins" },
      { label: "Service revenue", value: "$415", note: "Square-derived demo" },
      { label: "Tips", value: "$86", note: "Square-derived demo" },
      { label: "Provisional commission", value: "$312", note: "Calculated demo" },
    ],
    schedule: [
      { time: "9:00 AM", client: "M. Alvarez", service: "Fade Cut", status: "Checked in" },
      { time: "10:00 AM", client: "J. Rivera", service: "Hair & Beard Ritual", status: "Confirmed" },
      { time: "11:30 AM", client: "Walk-in #A14", service: "Beard Trim", status: "Waiting" },
      { time: "1:00 PM", client: "T. Martin", service: "Custom Cut", status: "Confirmed" },
    ],
  },
  reception: {
    metrics: [
      { label: "Booked today", value: "22", note: "Across two chairs" },
      { label: "Waiting", value: "4", note: "Longest wait 28 min" },
      { label: "Checked in", value: "3", note: "Ready for assignment" },
      { label: "Late arrivals", value: "1", note: "Needs outreach" },
    ],
    queue: [
      { token: "A14", service: "Beard Trim", preference: "First available", wait: "12 min", status: "Waiting" },
      { token: "A15", service: "Fade Cut", preference: "Carlos", wait: "28 min", status: "Confirmed" },
      { token: "A16", service: "Shape-Up", preference: "First available", wait: "36 min", status: "Waiting" },
    ],
  },
  admin: {
    metrics: [
      { label: "Service revenue", value: "$3,840", note: "+8.2% vs prior period" },
      { label: "Appointments", value: "84", note: "74 completed" },
      { label: "Average ticket", value: "$52.40", note: "Calculated demo" },
      { label: "Rebooking", value: "61%", note: "+4 pts" },
      { label: "New clients", value: "18", note: "Website 44%" },
      { label: "Review score", value: "4.9", note: "Demo value only" },
    ],
    activity: [
      { item: "Square catalog sync", owner: "System", status: "Awaiting credentials", time: "Integration" },
      { item: "Membership draft updated", owner: "Owner", status: "Review", time: "Today" },
      { item: "Negative feedback alert", owner: "Manager", status: "Resolved", time: "Yesterday" },
      { item: "Weekly statement run", owner: "System", status: "Demo", time: "Mon" },
    ],
  },
} as const;

export const adminModules = [
  "Executive dashboard", "Operations", "Bookings", "Walk-ins", "Queue", "Customers", "Barbers", "Staff", "Services", "Pricing", "Locations", "Memberships", "Packages", "Gift cards", "Promotions", "Referrals", "Rewards", "Reviews", "Support cases", "Commissions", "Attribution", "Reconciliation", "Disputes", "Statements", "Campaigns", "Automations", "Templates", "Content", "Gallery", "Journal", "FAQs", "Policies", "SEO", "Analytics", "Integrations", "Webhooks", "Sync health", "Audit logs", "Users", "Roles", "Permissions", "Feature flags", "Business settings", "Notification settings", "AI settings", "Data controls", "System health",
] as const;

export const journalBodies: Record<string, { heading: Bi; paragraphs: Bi[]; takeaways: Bi[] }> = {
  "how-often-to-book-a-fade": {
    heading: { en: "The right interval depends on contrast, growth, and the finish you prefer.", es: "El intervalo correcto depende del contraste, crecimiento y acabado que prefieras." },
    paragraphs: [
      { en: "A skin or high-contrast fade usually loses its cleanest edge sooner than a soft taper. For many guests, two to three weeks keeps the silhouette intentional without feeling over-maintained.", es: "Un skin fade o degradado de alto contraste suele perder el borde limpio antes que un taper suave. Para muchos, dos o tres semanas mantiene la silueta intencional." },
      { en: "Your barber can build a maintenance plan around work, events, budget, and how quickly your neckline and temples change.", es: "Tu barbero puede crear un plan según trabajo, eventos, presupuesto y la velocidad de crecimiento." },
    ],
    takeaways: [
      { en: "Skin fades: commonly 2–3 weeks", es: "Skin fades: normalmente 2–3 semanas" },
      { en: "Soft tapers: often 3–5 weeks", es: "Tapers suaves: normalmente 3–5 semanas" },
      { en: "Shape-ups can extend the polished period", es: "Un perfilado puede extender el acabado limpio" },
    ],
  },
  "beard-shape-and-face-balance": {
    heading: { en: "A strong beard shape works with the face rather than copying a photograph exactly.", es: "Una buena forma de barba trabaja con el rostro en lugar de copiar una foto exactamente." },
    paragraphs: [
      { en: "Density, growth direction, cheek line, neckline, and jaw proportion determine which shape will look natural and remain manageable between visits.", es: "Densidad, dirección de crecimiento, línea de mejilla, cuello y mandíbula determinan qué forma se verá natural." },
      { en: "A consultation should identify where to preserve weight, where to create structure, and how much daily styling the guest is willing to maintain.", es: "La consulta debe identificar dónde conservar peso, dónde crear estructura y cuánto peinado diario desea mantener el cliente." },
    ],
    takeaways: [
      { en: "Keep the neckline deliberate", es: "Mantén la línea del cuello intencional" },
      { en: "Balance density instead of chasing perfect symmetry", es: "Equilibra densidad en lugar de perseguir simetría perfecta" },
      { en: "Use conditioning to improve the finished shape", es: "Usa acondicionamiento para mejorar la forma" },
    ],
  },
  "prepare-for-your-first-lounge-visit": {
    heading: { en: "A little preparation makes consultation faster and the result clearer.", es: "Un poco de preparación hace la consulta más rápida y el resultado más claro." },
    paragraphs: [
      { en: "Bring one or two reference images, but also explain what you like about them. Length, texture, maintenance, and how the style looks after two weeks are often more important than the photograph itself.", es: "Trae una o dos imágenes, pero explica qué te gusta. Largo, textura y mantenimiento suelen ser más importantes que la foto." },
      { en: "Arrive with hair in its normal condition, mention sensitivities or product concerns, and allow a few minutes for the barber to confirm the plan before starting.", es: "Llega con el cabello en su condición normal, menciona sensibilidades y permite unos minutos para confirmar el plan." },
    ],
    takeaways: [
      { en: "Bring useful references", es: "Trae referencias útiles" },
      { en: "Explain your routine and maintenance preference", es: "Explica tu rutina y preferencia de mantenimiento" },
      { en: "Arrive five to ten minutes early", es: "Llega de cinco a diez minutos antes" },
    ],
  },
};
