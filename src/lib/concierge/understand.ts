/**
 * Reads a client's chat message in English or Spanish and pulls out what the
 * booking needs: intent, service, barber, family size, date, time.
 *
 * It never decides anything. It only names what the client asked for; every
 * answer and every open time still comes from the live catalog and the one
 * availability engine. Pure and dependency-free so the server, the browser
 * and node:test share it.
 */

export type ConciergeLanguage = "en" | "es";

export type Intent =
  | "book"
  | "availability"
  | "soonest"
  | "services"
  | "price"
  | "duration"
  | "barbers"
  | "hours"
  | "location"
  | "contact"
  | "walkins"
  | "payment"
  | "manage"
  | "policy"
  | "membership"
  | "giftcards"
  | "packages"
  | "kids"
  | "senior"
  | "color"
  | "languages"
  | "accessibility"
  | "greeting"
  | "thanks"
  | "restart"
  | "human";

export type PartOfDay = "morning" | "afternoon" | "evening";

export type Understanding = {
  intents: Intent[];
  serviceSlug?: string;
  barberSlug?: string;
  firstAvailable?: boolean;
  family?: boolean;
  familyChildren?: number;
  /** YYYY-MM-DD in the lounge's time zone. */
  date?: string;
  /** HH:MM, 24-hour, lounge time. */
  time?: string;
  partOfDay?: PartOfDay;
  /** A yes / no reply, for confirmations. */
  affirmative?: boolean;
  negative?: boolean;
};

export type CatalogNames = {
  services: Array<{ slug: string; name: string }>;
  barbers: Array<{ slug: string; name: string }>;
};

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9:/'+\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function has(text: string, pattern: RegExp) {
  return pattern.test(text);
}

const INTENT_PATTERNS: Array<[Intent, RegExp]> = [
  ["restart", /\b(start over|start again|restart|reset|empezar de nuevo|comenzar de nuevo|reiniciar)\b/],
  ["manage", /\b(cancel|reschedul\w*|move my|change my (appointment|booking|time)|modify my|cancelar|reprogramar|cambiar mi (cita|reserva|hora)|mover mi cita)\b/],
  ["book", /\b(book\w*|appointment|appt|schedule me|reserv\w*|set me up|get me in|sign me up|cita|agend\w*|apart\w*|turno|quiero (un|una) (corte|cita))\b/],
  ["soonest", /\b(soonest|earliest|asap|as soon as possible|first available|next available|right now|lo antes posible|lo mas pronto|lo mas temprano|primer(a|o)? disponible|proxim(o|a) disponible)\b/],
  ["availability", /\b(availab\w*|opening\w*|open slot\w*|free (time|slot)|any (time|slot)\w*|what times?|which times?|when can|disponib\w*|horarios? libres?|que horas?|cuando (puedo|hay|tiene))\b/],
  ["price", /\b(price\w*|cost\w*|how much|rate\w*|charge|precio\w*|cuanto (cuesta|vale|cobran|es)|costo\w*|tarifa\w*)\b/],
  ["duration", /\b(how long|duration|minutes? (does|is)|cuanto (dura|tiempo|tarda)|duracion)\b/],
  ["services", /\b(services?|menu|offer\w*|what do you do|servicios?|que hacen|que ofrecen)\b/],
  ["barbers", /\b(barbers?|stylists?|staff|team|who (cuts|works)|barberos?|quien(es)? (corta|trabaja))\b/],
  ["hours", /\b(hours?|open(ing)? (time|hours)|are you open|close(s|d)?|closing|horario\w*|abren|abierto\w*|cierran|cerrado\w*)\b/],
  ["location", /\b(where|address|located|location|directions|parking|park|direccion|ubicacion|ubicad\w*|donde|estacionamiento|como llego)\b/],
  ["contact", /\b(phone|call you|your number|phone number|email|contact|telefono|llamar|su numero|tu numero|correo|contacto)\b/],
  ["human", /\b(human|real person|a person|agent|representative|speak to|talk to|persona real|hablar con (alguien|una persona))\b/],
  ["walkins", /\b(walk ?-?ins?|without (an )?appointment|no appointment|sin cita|sin reserva)\b/],
  ["payment", /\b(pay|paying|payment|deposit|card|cash|fee|square|checkout|pagar|pago|deposito|tarjeta|efectivo|cargo)\b/],
  ["policy", /\b(polic(y|ies)|no ?-?show|refund\w*|late|cancellation (fee|policy)|politica\w*|reembolso\w*|tarde)\b/],
  ["membership", /\b(member\w*|subscription|membresia\w*|suscripcion)\b/],
  ["giftcards", /\b(gift ?cards?|vouchers?|tarjetas? de regalo|regalo)\b/],
  ["packages", /\b(packages?|wedding|event|executive|groom\w*|paquete\w*|boda\w*|evento\w*|ejecutivo)\b/],
  ["kids", /\b(kids? price|age limit|how old|edad|limite de edad)\b/],
  ["senior", /\b(senior\w*|elderly|older|tercera edad|mayor(es)?)\b/],
  ["color", /\b(colou?r|dye|tint|bleach|highlights?|tinte|decolor\w*|mechas)\b/],
  ["languages", /\b(spanish|english|espanol|ingles|speak|hablan|idioma\w*)\b/],
  ["accessibility", /\b(wheelchair|accessib\w*|disabilit\w*|sensory|autis\w*|silla de ruedas|accesib\w*|discapacidad)\b/],
  ["greeting", /^(hi|hello|hey|yo|good (morning|afternoon|evening)|hola|buenas|buenos dias|buenas (tardes|noches)|saludos)\b/],
  ["thanks", /\b(thanks|thank you|thx|appreciate|gracias|te agradezco)\b/],
];

const SERVICE_SYNONYMS: Record<string, string[]> = {
  "cut-and-beard": ["cut and beard", "haircut and beard", "cut plus beard", "cut + beard", "cut & beard", "hair and beard", "beard and cut", "beard and haircut", "corte y barba", "corte mas barba", "barba y corte", "combo"],
  "skin-fade": ["skin fade", "bald fade", "fade", "taper", "desvanecido", "degradado", "difuminado"],
  "hot-towel-shave": ["hot towel shave", "hot towel", "shave", "afeitado", "toalla caliente", "rasurado", "afeitada"],
  "kids-haircut": ["kids haircut", "kid haircut", "kids cut", "kid cut", "child haircut", "children haircut", "boys haircut", "corte de nino", "corte infantil", "corte para nino", "corte para mi hijo", "ninos"],
  "senior-haircut": ["senior haircut", "senior cut", "corte senior", "corte para mayores"],
  "line-up": ["line up", "lineup", "line-up", "edge up", "shape up", "shapeup", "perfilado", "delineado", "contorno"],
  beard: ["beard trim", "beard", "barba", "arreglo de barba"],
  design: ["design", "designs", "hair design", "diseno", "disenos"],
  haircut: ["haircuts", "haircut", "hair cut", "a cut", "cuts", "cut", "trim", "corte de pelo", "corte de cabello", "recorte", "corte"],
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5,
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
};

const KID_WORDS = "(kids?|child|children|sons?|boys?|daughters?|girls?|nin(o|a|os|as)|hij(o|a|os|as)|chamac\\w*|peque\\w*)";

const WEEKDAYS: Array<[number, RegExp]> = [
  [0, /\b(sunday|sun|domingo)\b/],
  [1, /\b(monday|mon|lunes)\b/],
  [2, /\b(tuesday|tues|tue|martes)\b/],
  [3, /\b(wednesday|wed|miercoles)\b/],
  [4, /\b(thursday|thurs|thur|thu|jueves)\b/],
  [5, /\b(friday|fri|viernes)\b/],
  [6, /\b(saturday|sat|sabado)\b/],
];

const MONTHS: Array<[number, RegExp]> = [
  [1, /^(jan|january|ene|enero)$/], [2, /^(feb|february|febrero)$/], [3, /^(mar|march|marzo)$/],
  [4, /^(apr|april|abr|abril)$/], [5, /^(may|mayo)$/], [6, /^(jun|june|junio)$/],
  [7, /^(jul|july|julio)$/], [8, /^(aug|august|ago|agosto)$/], [9, /^(sep|sept|september|septiembre|setiembre)$/],
  [10, /^(oct|october|octubre)$/], [11, /^(nov|november|noviembre)$/], [12, /^(dec|december|dic|diciembre)$/],
];
const MONTH_WORD = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|ene(?:ro)?|febrero|marzo|abr(?:il)?|mayo|junio|julio|ago(?:sto)?|septiembre|setiembre|octubre|noviembre|dic(?:iembre)?)";

function monthNumber(word: string) {
  return MONTHS.find(([, pattern]) => pattern.test(word))?.[0] ?? null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function addDaysTo(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function weekdayOf(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function validDate(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day, 12));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}

/** The next occurrence of month/day on or after today. */
function upcoming(today: string, month: number, day: number) {
  const year = Number(today.slice(0, 4));
  for (const candidate of [year, year + 1]) {
    if (!validDate(candidate, month, day)) continue;
    const date = `${candidate}-${pad(month)}-${pad(day)}`;
    if (date >= today) return date;
  }
  return null;
}

type Extracted<T> = { value: T; rest: string };

function extractDate(text: string, today: string): Extracted<string> | null {
  const rules: Array<[RegExp, (match: RegExpMatchArray) => string | null]> = [
    [/\b(day after tomorrow|pasado manana)\b/, () => addDaysTo(today, 2)],
    [/\b(today|tonight|hoy|esta noche|this (morning|afternoon|evening))\b/, () => today],
    [/\b(tomorrow|tmrw|tmr)\b/, () => addDaysTo(today, 1)],
    // "manana" means tomorrow unless it is "the morning" ("por la manana").
    [/(?:^|[^a-z])((?:la|por|en|de|esta) )?manana\b/, (m) => (m[1] ? null : addDaysTo(today, 1))],
    [new RegExp(`\\b${MONTH_WORD}\\.? (\\d{1,2})(st|nd|rd|th)?\\b`), (m) => { const month = monthNumber(m[1]); return month ? upcoming(today, month, Number(m[2])) : null; }],
    [new RegExp(`\\b(\\d{1,2})(st|nd|rd|th)? (de )?${MONTH_WORD}\\b`), (m) => { const month = monthNumber(m[4]); return month ? upcoming(today, month, Number(m[1])) : null; }],
    [/\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => (validDate(Number(m[1]), Number(m[2]), Number(m[3])) ? `${m[1]}-${m[2]}-${m[3]}` : null)],
    [/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, (m) => upcoming(today, Number(m[1]), Number(m[2]))],
    [/\b(the|el|dia) (\d{1,2})(st|nd|rd|th)?\b(?! (am|pm|kids?|ninos?|hijos?))/, (m) => {
      const day = Number(m[2]);
      const [year, month] = today.split("-").map(Number);
      const thisMonth = validDate(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : null;
      if (thisMonth && thisMonth >= today) return thisMonth;
      const nextMonth = month === 12 ? 1 : month + 1;
      return upcoming(today, nextMonth, day);
    }],
  ];
  for (const [pattern, resolve] of rules) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = resolve(match);
    if (value) return { value, rest: text.replace(match[0], " ") };
  }
  for (const [weekday, pattern] of WEEKDAYS) {
    const match = text.match(pattern);
    if (!match) continue;
    const next = new RegExp(`\\b(next|proximo|que viene)\\b[^a-z]*${match[0]}|${match[0]}[^a-z]*\\b(next week|que viene|de la proxima semana)\\b`).test(text);
    let offset = (weekday - weekdayOf(today) + 7) % 7;
    if (next && offset === 0) offset = 7;
    return { value: addDaysTo(today, offset), rest: text.replace(match[0], " ") };
  }
  return null;
}

function extractTime(text: string): Extracted<string> | null {
  if (/\b(noon|mediodia|medio dia)\b/.test(text)) return { value: "12:00", rest: text.replace(/\b(noon|mediodia|medio dia)\b/, " ") };
  const patterns = [
    /\b(\d{1,2})(?::(\d{2}))? ?(a\.?m\.?|p\.?m\.?|am|pm)\b/,
    /\b(\d{1,2}):(\d{2})\b/,
    /\b(?:at|around|@|by|a las|alrededor de las|como a las|tipo|sobre las) (\d{1,2})(?::(\d{2}))?\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    let hour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    const marker = (match[3] ?? "").replaceAll(".", "");
    if (hour > 23 || minute > 59) continue;
    if (marker === "pm" && hour < 12) hour += 12;
    else if (marker === "am" && hour === 12) hour = 0;
    else if (!marker && hour >= 1 && hour <= 7) hour += 12; // The lounge opens at 8 AM: "at 3" means 3 PM.
    else if (!marker && hour <= 11 && /\b(tonight|evening|night|noche|tarde)\b/.test(text)) hour += 12;
    return { value: `${pad(hour)}:${pad(minute)}`, rest: text.replace(match[0], " ") };
  }
  return null;
}

function extractPartOfDay(text: string): PartOfDay | undefined {
  if (/\b(morning|this morning|por la manana|en la manana|de la manana|temprano|early)\b/.test(text)) return "morning";
  if (/\b(afternoon|lunch|this afternoon|por la tarde|en la tarde|de la tarde|mediodia)\b/.test(text)) return "afternoon";
  if (/\b(evening|tonight|night|after work|after 5|por la noche|en la noche|de la noche|despues del trabajo)\b/.test(text)) return "evening";
  return undefined;
}

function countNear(text: string, kidPattern: string) {
  const digits = text.match(new RegExp(`\\b(\\d)\\s+(little |young |small |mis |my )?${kidPattern}`));
  if (digits) return Number(digits[1]);
  const words = text.match(new RegExp(`\\b(one|two|three|four|five|a|an|un|uno|una|dos|tres|cuatro|cinco)\\s+(little |young |small |mis |my )?${kidPattern}`));
  if (words) return NUMBER_WORDS[words[1]] ?? null;
  return null;
}

function extractFamily(text: string): { family: boolean; children?: number } {
  const familyWord = /\b(family|familia|familiar)\b/.test(text);
  const adultWithKids = new RegExp(`\\b(me and|myself and|me plus|for me and|yo y|para mi y|conmigo y)\\b.*${KID_WORDS}`).test(text);
  if (!familyWord && !adultWithKids) return { family: false };
  const explicit = text.match(/\b(family|familia) ?(\d)\b/);
  if (explicit) return { family: true, children: Number(explicit[2]) };
  const near = countNear(text, KID_WORDS);
  if (near) return { family: true, children: near };
  if (/\b(my|mi) (son|daughter|kid|child|boy|girl|hijo|hija|nino|nina)\b/.test(text) && !/\b(kids|sons|boys|daughters|girls|children|ninos|ninas|hijos|hijas)\b/.test(text)) {
    return { family: true, children: 1 };
  }
  return { family: true };
}

/** Phrases that identify a service, longest first, limited to services the catalog really has. */
export function servicePhrases(catalog: CatalogNames) {
  const phrases: Array<{ phrase: string; slug: string }> = [];
  for (const service of catalog.services) {
    phrases.push({ phrase: normalize(service.name), slug: service.slug });
    phrases.push({ phrase: normalize(service.slug.replaceAll("-", " ")), slug: service.slug });
    for (const synonym of SERVICE_SYNONYMS[service.slug] ?? []) phrases.push({ phrase: normalize(synonym), slug: service.slug });
  }
  return phrases.filter((item) => item.phrase.length > 1).sort((a, b) => b.phrase.length - a.phrase.length);
}

function extractService(text: string, catalog: CatalogNames, familyRequested: boolean) {
  for (const { phrase, slug } of servicePhrases(catalog)) {
    if (!new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text)) continue;
    // In a family booking, "kids" describes the children, not the adult's service.
    if (familyRequested && slug === "kids-haircut") continue;
    return slug;
  }
  return undefined;
}

/** Name tokens that point to exactly one barber; shared last names and Spanish articles are left out. */
export function barberTokens(catalog: CatalogNames) {
  const STOP = new Set(["jr", "sr", "the", "barber", "los", "las", "el", "la", "de", "del", "y", "and"]);
  const owners = new Map<string, Set<string>>();
  const add = (token: string, slug: string) => {
    if (token.length < 3 || STOP.has(token)) return;
    owners.set(token, (owners.get(token) ?? new Set()).add(slug));
  };
  for (const barber of catalog.barbers) {
    const name = normalize(barber.name).replace(/[()]/g, " ");
    for (const token of name.split(/[\s,]+/)) add(token.replace(/'/g, ""), barber.slug);
    if (/\blo's\b|\blos\b/.test(name) || barber.slug === "barber-los") {
      add("lo's", barber.slug);
      add("los barber", barber.slug);
    }
  }
  const tokens: Array<{ token: string; slug: string }> = [];
  for (const [token, slugs] of owners) if (slugs.size === 1) tokens.push({ token, slug: [...slugs][0] });
  for (const barber of catalog.barbers) tokens.push({ token: normalize(barber.name).replace(/[(),]/g, " ").replace(/\s+/g, " ").trim(), slug: barber.slug });
  return tokens.sort((a, b) => b.token.length - a.token.length);
}

function extractBarber(text: string, catalog: CatalogNames) {
  const loose = text.replace(/'/g, "");
  if (/\bbarber lo'?s\b|\blo's\b/.test(text)) {
    const los = catalog.barbers.find((barber) => barber.slug === "barber-los");
    if (los) return los.slug;
  }
  for (const { token, slug } of barberTokens(catalog)) {
    const escaped = token.replace(/'/g, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(loose)) return slug;
  }
  return undefined;
}

export function understand(input: string, options: { catalog: CatalogNames; today: string }): Understanding {
  const text = normalize(input);
  const result: Understanding = { intents: [] };
  if (!text) return result;

  for (const [intent, pattern] of INTENT_PATTERNS) if (has(text, pattern)) result.intents.push(intent);

  if (/\b(anyone|anybody|any barber|whoever|no preference|doesn'?t matter|cualquier(a)?|el que sea|quien sea|me da igual|sin preferencia|first available|primer(o|a)? disponible)\b/.test(text)) result.firstAvailable = true;
  if (/^(yes|yeah|yep|sure|ok|okay|correct|confirm|si|claro|dale|correcto|confirmo|perfecto)\b/.test(text)) result.affirmative = true;
  if (/^(no|nope|nah|not now|no gracias)\b/.test(text)) result.negative = true;

  const family = extractFamily(text);
  if (family.family) {
    result.family = true;
    if (family.children && family.children >= 1 && family.children <= 5) result.familyChildren = family.children;
  }

  let rest = text;
  const date = extractDate(rest, options.today);
  if (date) { result.date = date.value; rest = date.rest; }
  // Kid counts are not times: "2 kids at 3" is three o'clock.
  rest = rest.replace(new RegExp(`\\b(\\d)\\s+(little |young |small |mis |my )?${KID_WORDS}`, "g"), " ");
  const time = extractTime(rest);
  if (time) result.time = time.value;
  const part = extractPartOfDay(text);
  if (part) result.partOfDay = part;

  result.serviceSlug = extractService(text, options.catalog, Boolean(result.family));
  result.barberSlug = extractBarber(text, options.catalog);

  // A service, a barber, a date or a time with no question word is a booking request.
  const informational = result.intents.some((intent) => !["book", "availability", "soonest", "greeting", "thanks"].includes(intent));
  if (!result.intents.includes("book") && !informational && (result.serviceSlug || result.family) && (result.date || result.time || result.barberSlug || result.intents.includes("soonest"))) {
    result.intents.push("book");
  }
  return result;
}
