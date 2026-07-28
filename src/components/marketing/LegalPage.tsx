import { business } from "@/lib/content/site";

export function LegalPage({
  title,
  updated = "July 28, 2026",
  sections,
}: {
  title: string;
  updated?: string;
  sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
}) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-24 sm:px-10">
      <p className="text-[10px] tracking-[0.34em] uppercase text-[var(--color-brass)]">Business policy</p>
      <h1 className="font-display mt-5 text-5xl text-[var(--color-bone)] sm:text-7xl">{title}</h1>
      <p className="mt-5 text-sm text-[var(--color-bone-muted)]">Last updated {updated}</p>
      <div className="hairline my-12" />
      <div className="space-y-12">
        {sections.map((section) => (
          <section key={section.heading} aria-labelledby={section.heading.toLowerCase().replaceAll(" ", "-")}>
            <h2 id={section.heading.toLowerCase().replaceAll(" ", "-")} className="font-display text-2xl text-[var(--color-bone)]">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--color-bone-muted)]">
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets?.length ? (
                <ul className="list-disc space-y-2 pl-5">
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-16 border-t border-[var(--color-ink-line)] pt-7 text-sm text-[var(--color-bone-muted)]">
        Questions may be directed to <a className="text-[var(--color-brass)]" href={`mailto:${business.email}`}>{business.email}</a> or {business.phone}.
      </div>
    </main>
  );
}
