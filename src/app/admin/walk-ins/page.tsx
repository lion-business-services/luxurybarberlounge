import type { Metadata } from "next";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { dateInZone, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { businessConfig } from "@/lib/config/business";

export const metadata: Metadata = { title: "Walk Ins", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

function money(cents: number | null) {
  if (typeof cents !== "number") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function nextLocalDate(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function localDateTime(value: string | null) {
  if (!value) return "Time not recorded";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: businessConfig.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function Page() {
  const session = await getServerAuthSession();
  const allowed = session.user && session.roles.some((role) => ["manager", "owner", "super_admin"].includes(role));

  if (!allowed) {
    return <main className="p-8"><div className="rounded-xl border border-[var(--color-ink-line)] p-6 text-sm text-[var(--color-bone-muted)]">Your secure admin session is required to view walk-ins.</div></main>;
  }

  const supabase = createUntypedAdminSupabase();
  if (!supabase) {
    return <main className="p-8"><div className="rounded-xl border border-[var(--color-ink-line)] p-6 text-sm text-[var(--color-bone-muted)]">Walk-in data is temporarily unavailable.</div></main>;
  }

  const { data: business } = await supabase.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const businessId = typeof business?.id === "string" ? business.id : null;
  const today = dateInZone(new Date(), businessConfig.timezone);
  const tomorrow = nextLocalDate(today);
  const start = zonedDateTimeToUtc(today, "00:00:00", businessConfig.timezone);
  const end = zonedDateTimeToUtc(tomorrow, "00:00:00", businessConfig.timezone);

  const { data, error } = businessId
    ? await supabase
        .from("queue_entries")
        .select("id,public_token,client_name,client_phone,client_email,service_slug,status,estimated_wait_minutes,joined_at,walk_in_at,service_price_snapshot_cents,metadata")
        .eq("business_id", businessId)
        .gte("walk_in_at", start.toISOString())
        .lt("walk_in_at", end.toISOString())
        .order("walk_in_at", { ascending: true })
        .limit(200)
    : { data: [], error: null };

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const active = rows.filter((row) => !["completed", "cancelled", "no_show"].includes(String(row.status))).length;

  return (
    <main className="grid gap-6">
      <header>
        <p className="text-[9px] uppercase tracking-[.18em] text-[var(--color-brass)]">Daily operations</p>
        <h1 className="font-display mt-2 text-4xl">Walk-Ins</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-bone-muted)]">Every walk-in recorded for today remains visible here, including completed visits. Date, time, contact, service and the captured service total come from the live queue record.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-[var(--color-ink-line)] p-5"><p className="text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Walk-ins today</p><p className="font-display mt-2 text-3xl">{rows.length}</p></article>
        <article className="rounded-xl border border-[var(--color-ink-line)] p-5"><p className="text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Active now</p><p className="font-display mt-2 text-3xl">{active}</p></article>
        <article className="rounded-xl border border-[var(--color-ink-line)] p-5"><p className="text-[9px] uppercase tracking-[.14em] text-[var(--color-bone-muted)]">Lounge date</p><p className="font-display mt-2 text-2xl">{today}</p></article>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--color-ink-line)]">
        {error ? <p className="p-6 text-sm text-red-200">Walk-in records could not be loaded. Please refresh once.</p> : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-[var(--color-ink-line)] bg-white/[.025] text-[9px] uppercase tracking-[.14em] text-[var(--color-brass)]"><tr><th className="px-5 py-4">Client</th><th className="px-5 py-4">Walk-in date & time</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Service</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Token</th></tr></thead>
              <tbody>
                {rows.map((row) => {
                  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {};
                  const starting = metadata.serviceStartingPrice === true;
                  return <tr key={String(row.id)} className="border-b border-[var(--color-ink-line)] last:border-0"><td className="px-5 py-4"><strong>{String(row.client_name ?? "Unnamed walk-in")}</strong></td><td className="px-5 py-4">{localDateTime(typeof row.walk_in_at === "string" ? row.walk_in_at : null)}</td><td className="px-5 py-4"><div>{String(row.client_email ?? "No email")}</div><div className="mt-1 text-xs text-[var(--color-bone-muted)]">{String(row.client_phone ?? "No phone")}</div></td><td className="px-5 py-4">{String(row.service_slug ?? "Service pending").replaceAll("-", " ")}</td><td className="px-5 py-4">{starting ? "From " : ""}{money(typeof row.service_price_snapshot_cents === "number" ? row.service_price_snapshot_cents : null)}</td><td className="px-5 py-4 capitalize">{String(row.status ?? "unknown").replaceAll("_", " ")}</td><td className="px-5 py-4 font-mono text-xs">{String(row.public_token ?? "—")}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="p-6 text-sm text-[var(--color-bone-muted)]">No walk-ins have been recorded for today.</p>}
      </section>
    </main>
  );
}