import { barbers, services } from "@/lib/content/site";

/** The existing hero stat block, unchanged in content and styling. */
export function HeroStats({ lang, className }: { lang: "en" | "es"; className?: string }) {
  const rows: [string, string][] = [
    [lang === "es" ? "Cortes" : "Cuts", String(services.length).padStart(2, "0")],
    [lang === "es" ? "Sillas" : "Chairs", String(barbers.length).padStart(2, "0")],
    [lang === "es" ? "Servicio" : "Service", lang === "es" ? "Con cita" : "By appointment"],
    [lang === "es" ? "Miembros" : "Members", lang === "es" ? "Por invitación" : "Invitation only"],
  ];
  return (
    <dl className={`grid grid-cols-2 gap-y-6 text-[11px] tracking-[0.24em] uppercase ${className ?? ""}`}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[var(--color-bone-muted)]">{label}</dt>
          <dd className="font-display mt-2 text-2xl tracking-tight text-[var(--color-brass)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
