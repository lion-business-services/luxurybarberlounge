import Link from "next/link";
import { CheckCircle2, Clock3, Scissors, UsersRound } from "lucide-react";

import { businessConfig } from "@/lib/config/business";
import { getQueueContext } from "@/lib/queue/operations";

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata = {
  title: "Walk-In Confirmation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatWalkInTime(value: string | null | undefined) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: businessConfig.timezone,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusCopy(status: string) {
  switch (status) {
    case "called":
    case "ready":
      return {
        eyebrow: "Your chair is ready",
        title: "Please head to your barber.",
        body: "Reception has called your turn. Please remain nearby and follow the in-lounge queue board for the latest chair status.",
      };
    case "in_service":
      return {
        eyebrow: "Service in progress",
        title: "You’re in the chair.",
        body: "Your walk-in is actively being served. Thank you for choosing Luxury Barber Lounge.",
      };
    case "completed":
      return {
        eyebrow: "Visit completed",
        title: "Thank you for visiting.",
        body: "Your walk-in visit is complete. We appreciate your business and look forward to seeing you again.",
      };
    case "cancelled":
    case "removed":
    case "no_show":
      return {
        eyebrow: "Queue status updated",
        title: "This queue entry is no longer active.",
        body: "Please speak with reception if you need help creating a new walk-in entry.",
      };
    default:
      return {
        eyebrow: "Walk-in confirmed",
        title: "You’re officially in the queue.",
        body: "Your walk-in has been confirmed and is being tracked by the lounge. Keep an eye on the live queue board for your position and remaining wait time.",
      };
  }
}

export default async function Page({ params }: Props) {
  const { token } = await params;
  const normalizedToken = token.trim().toUpperCase();
  const context = await getQueueContext();

  if (!context) {
    return <Unavailable token={normalizedToken} />;
  }

  const { data: entry } = await context.admin
    .from("queue_entries")
    .select(
      "id,public_token,status,estimated_wait_minutes,walk_in_at,service_id,service_slug,barber_preference,public_display_label",
    )
    .eq("location_id", context.locationId)
    .eq("public_token", normalizedToken)
    .maybeSingle();

  if (!entry?.id) {
    return <Unavailable token={normalizedToken} />;
  }

  const [{ data: assignment }, { data: service }] = await Promise.all([
    context.admin
      .from("queue_assignments")
      .select("barber_user_id,active,assigned_at")
      .eq("queue_entry_id", entry.id)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    entry.service_id
      ? context.admin
          .from("services")
          .select("name")
          .eq("id", entry.service_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let barberName: string | null = null;

  if (assignment?.barber_user_id) {
    const { data: barber } = await context.admin
      .from("barber_profiles")
      .select("display_name")
      .eq("business_id", context.businessId)
      .eq("staff_user_id", assignment.barber_user_id)
      .maybeSingle();

    barberName =
      typeof barber?.display_name === "string"
        ? barber.display_name
        : null;
  }

  const serviceName =
    typeof service?.name === "string"
      ? service.name
      : entry.service_slug
        ? String(entry.service_slug)
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ")
        : "Selected service";

  const walkInTime = formatWalkInTime(entry.walk_in_at);
  const wait =
    typeof entry.estimated_wait_minutes === "number"
      ? Math.max(0, entry.estimated_wait_minutes)
      : null;
  const copy = statusCopy(String(entry.status));

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_20%,rgba(184,134,42,.18),#080808_64%)] px-6 py-12 text-[var(--color-bone)]">
      <section className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[var(--color-brass)]/25 bg-[#0d0d0d]/95 shadow-2xl shadow-black/40">
        <div className="border-b border-white/[.07] px-7 py-8 text-center sm:px-12 sm:py-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--color-brass)]/45 bg-[var(--color-brass)]/10">
            <CheckCircle2 className="h-8 w-8 text-[var(--color-brass)]" />
          </div>

          <p className="mt-6 text-[10px] uppercase tracking-[.3em] text-[var(--color-brass)]">
            {copy.eyebrow}
          </p>

          <h1 className="font-display mt-3 text-4xl sm:text-6xl">
            {copy.title}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--color-bone-muted)]">
            {copy.body}
          </p>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
          <Detail icon={<UsersRound className="h-4 w-4" />} label="Queue token" value={normalizedToken} />
          <Detail icon={<Scissors className="h-4 w-4" />} label="Assigned barber" value={barberName ?? "Assignment in progress"} />
          <Detail icon={<Clock3 className="h-4 w-4" />} label="Walk-in time" value={walkInTime ?? "Recorded by reception"} />
          <Detail
            icon={<Clock3 className="h-4 w-4" />}
            label="Current wait"
            value={wait === null ? "Live estimate updating" : wait === 0 ? "Ready / about 0 min" : `About ${wait} min remaining`}
          />
        </div>

        <div className="border-t border-white/[.07] px-6 py-7 sm:px-8">
          <p className="text-center text-xs text-[var(--color-bone-muted)]">
            {serviceName} · Northfield Lounge
          </p>

          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/queue-board"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-brass)] px-8 py-3 text-[10px] font-semibold uppercase tracking-[.2em] text-black transition hover:brightness-110"
            >
              View live queue
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 px-8 py-3 text-[10px] uppercase tracking-[.2em] text-[var(--color-bone)] transition hover:border-[var(--color-brass)]/40"
            >
              Return to website
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-5 text-left">
      <div className="flex items-center gap-2 text-[var(--color-brass)]">
        {icon}
        <span className="text-[9px] uppercase tracking-[.2em]">{label}</span>
      </div>
      <p className="mt-3 text-lg font-medium">{value}</p>
    </div>
  );
}

function Unavailable({ token }: { token: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#080808] px-6 py-12 text-center text-[var(--color-bone)]">
      <section className="max-w-xl">
        <p className="text-[10px] uppercase tracking-[.3em] text-[var(--color-brass)]">Queue reference</p>
        <h1 className="font-display mt-4 text-5xl">{token || "Queue status"}</h1>
        <p className="mt-5 text-sm leading-7 text-[var(--color-bone-muted)]">
          We couldn’t load this queue entry right now. The live queue board remains available below.
        </p>
        <Link href="/queue-board" className="mt-7 inline-flex rounded-full bg-[var(--color-brass)] px-7 py-3 text-[10px] font-semibold uppercase tracking-[.2em] text-black">
          View live queue
        </Link>
      </section>
    </main>
  );
}
