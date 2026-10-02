import { businessConfig } from "@/lib/config/business";

export function money(cents: number | null | undefined) {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function dateTime(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  // Always the lounge's time zone. These helpers run on the server, whose
  // clock is UTC, so without it a 2:00 PM appointment would read as 6:00 PM.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: businessConfig.timezone,
    ...(options ?? {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  }).format(date);
}

export function shortDate(value: string | null | undefined) {
  return dateTime(value, { month: "short", day: "numeric", year: "numeric" });
}

export function titleCase(value: string | null | undefined) {
  if (!value) return "—";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function localizedName(value: unknown, fallback = "Untitled") {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["en", "name", "title", "label"]) {
      if (typeof record[key] === "string" && record[key]) return record[key] as string;
    }
  }
  return fallback;
}

export function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
