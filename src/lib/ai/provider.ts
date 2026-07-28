import { barbers, business, faqs, services } from "../content/site.ts";

export type ConciergeAnswer = {
  answer: string;
  suggestions: Array<{ label: string; href: string }>;
  provider: "development" | "configured";
  grounded: true;
};

export interface AiProvider {
  answerPublicQuestion(question: string, language: "en" | "es"): Promise<ConciergeAnswer>;
}

export class DevelopmentAiProvider implements AiProvider {
  async answerPublicQuestion(question: string, language: "en" | "es"): Promise<ConciergeAnswer> {
    const normalized = question.toLowerCase();
    if (/hour|open|close|horario|abren|cierran/.test(normalized)) {
      return result(language === "es" ? `El horario confirmado se muestra en la página Visítanos. También puedes llamar al ${business.phone}.` : `Confirmed hours are shown on the Visit page. You can also call ${business.phone}.`, [{ label: language === "es" ? "Ver horario" : "View hours", href: "/visit" }]);
    }
    if (/address|location|where|direc|ubic/.test(normalized)) {
      return result(language === "es" ? `Estamos en ${business.street}, ${business.city}, ${business.state} ${business.postalCode}.` : `We are located at ${business.street}, ${business.city}, ${business.state} ${business.postalCode}.`, [{ label: language === "es" ? "Cómo llegar" : "Directions", href: "/visit" }]);
    }
    const matchedService = services.find((item) => normalized.includes(item.name.en.toLowerCase()) || normalized.includes(item.name.es.toLowerCase()) || item.tags.some((tag) => normalized.includes(tag)));
    if (matchedService) {
      return result(`${matchedService.description[language]} ${language === "es" ? "Precio inicial" : "Starting price"}: $${matchedService.from}.`, [{ label: language === "es" ? "Ver servicio" : "View service", href: `/services/${matchedService.slug}` }, { label: language === "es" ? "Reservar" : "Book", href: `/book?service=${matchedService.slug}` }]);
    }
    if (/barber|barbero|ruben|rúben|carlos/.test(normalized)) {
      return result(language === "es" ? `Puedes conocer a ${barbers.map((item) => item.name).join(" y ")} y revisar sus especialidades antes de reservar.` : `Meet ${barbers.map((item) => item.name).join(" and ")} and review their specialties before booking.`, [{ label: language === "es" ? "Ver barberos" : "View barbers", href: "/barbers" }]);
    }
    const faq = faqs.find((item) => normalized.split(/\s+/).some((token) => token.length > 4 && item.question[language].toLowerCase().includes(token)));
    if (faq) return result(faq.answer[language], [{ label: "FAQ", href: "/faq" }]);
    return result(language === "es" ? "Puedo ayudarte con servicios, precios iniciales, barberos, ubicación, horario y políticas aprobadas. Para una excepción, habla directamente con el salón." : "I can help with published services, starting prices, barbers, location, hours, and approved policies. For an exception, contact the lounge directly.", [{ label: language === "es" ? "Explorar servicios" : "Explore services", href: "/services" }, { label: language === "es" ? "Contactar" : "Contact", href: "/contact" }]);
  }
}

export class ConfiguredAiProvider extends DevelopmentAiProvider {
  // A live model may be added here, but its output must remain constrained to
  // the same approved records and structured actions used by the fallback.
}

function result(answer: string, suggestions: ConciergeAnswer["suggestions"]): ConciergeAnswer {
  return { answer, suggestions, provider: "development", grounded: true };
}

export function getAiProvider(): AiProvider {
  return process.env.AI_PROVIDER_API_KEY ? new ConfiguredAiProvider() : new DevelopmentAiProvider();
}
