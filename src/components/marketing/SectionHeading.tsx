import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  copy,
  action,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  copy?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div
      className={
        align === "center"
          ? "mx-auto max-w-3xl text-center"
          : "flex flex-col gap-7 md:flex-row md:items-end md:justify-between"
      }
    >
      <div className={align === "center" ? "" : "max-w-3xl"}>
        <p className="text-[10px] tracking-[0.34em] uppercase text-[var(--color-brass)]">
          {eyebrow}
        </p>
        <h2 className="font-display mt-4 text-3xl leading-tight text-[var(--color-bone)] sm:text-5xl">
          {title}
        </h2>
        {copy ? (
          <div className="mt-5 max-w-2xl text-sm leading-7 text-[var(--color-bone-muted)] sm:text-base">
            {copy}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
