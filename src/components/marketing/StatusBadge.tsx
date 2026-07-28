import clsx from "clsx";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "info" | "danger";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] tracking-[0.24em] uppercase",
        tone === "success" && "border-emerald-600/40 bg-emerald-950/30 text-emerald-300",
        tone === "warning" && "border-amber-600/40 bg-amber-950/30 text-amber-200",
        tone === "info" && "border-cyan-700/40 bg-cyan-950/25 text-cyan-200",
        tone === "danger" && "border-red-700/40 bg-red-950/25 text-red-200",
        tone === "neutral" && "border-[var(--color-ink-line)] text-[var(--color-bone-muted)]",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
