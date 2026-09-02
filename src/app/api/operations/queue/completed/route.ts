import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth/server";
import { dateInZone, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { businessConfig } from "@/lib/config/business";
import { getQueueContext } from "@/lib/queue/operations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const allowed = new Set(["receptionist", "manager", "owner", "super_admin"]);

function nextLocalDate(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function localizedName(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const map = value as Record<string, unknown>;
    for (const key of ["en", "es"]) {
      if (typeof map[key] === "string" && String(map[key]).trim()) return String(map[key]).trim();
    }
  }
  return fallback;
}

export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => allowed.has(role))) {
    return NextResponse.json({ ok: false, message: "Operational access is required." }, { status: 403 });
  }

  const context = await getQueueContext();
  if (!context) {
    return NextResponse.json({ ok: true, entries: [] });
  }

  const today = dateInZone(new Date(), businessConfig.timezone);
  const tomorrow = nextLocalDate(today);
  const start = zonedDateTimeToUtc(today, "00:00:00", businessConfig.timezone);
  const end = zonedDateTimeToUtc(tomorrow, "00:00:00", businessConfig.timezone);

  const { data: queueRows, error } = await context.admin
    .from("queue_entries")
    .select("id,public_token,client_name,service_id,service_slug,service_price_snapshot_cents,status,walk_in_at,joined_at,completed_at")
    .eq("business_id", context.businessId)
    .eq("location_id", context.locationId)
    .is("appointment_id", null)
    .eq("status", "completed")
    .gte("walk_in_at", start.toISOString())
    .lt("walk_in_at", end.toISOString())
    .order("walk_in_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("completed-walk-ins-load", { code: error.code, message: error.message?.slice(0, 200) });
    return NextResponse.json({ ok: false, message: "Completed walk-ins could not be loaded." }, { status: 503 });
  }

  const rows = queueRows ?? [];
  const entryIds = rows.map((row) => String(row.id));
  const serviceIds = [...new Set(rows.map((row) => row.service_id ? String(row.service_id) : null).filter((id): id is string => Boolean(id)))];

  const [assignmentResult, servicesResult] = await Promise.all([
    entryIds.length
      ? context.admin
          .from("queue_assignments")
          .select("queue_entry_id,barber_user_id,assigned_at")
          .in("queue_entry_id", entryIds)
          .order("assigned_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    serviceIds.length
      ? context.admin.from("services").select("id,slug,name").in("id", serviceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (assignmentResult.error || servicesResult.error) {
    return NextResponse.json({ ok: false, message: "Completed walk-in details could not be loaded." }, { status: 503 });
  }

  const latestAssignment = new Map<string, string>();
  for (const row of assignmentResult.data ?? []) {
    const entryId = String(row.queue_entry_id);
    if (!latestAssignment.has(entryId) && row.barber_user_id) {
      latestAssignment.set(entryId, String(row.barber_user_id));
    }
  }

  const barberIds = [...new Set(latestAssignment.values())];
  const { data: barberRows, error: barberError } = barberIds.length
    ? await context.admin.from("barber_profiles").select("staff_user_id,display_name").in("staff_user_id", barberIds)
    : { data: [], error: null };

  if (barberError) {
    return NextResponse.json({ ok: false, message: "Completed walk-in barber details could not be loaded." }, { status: 503 });
  }

  const barberNames = new Map<string, string>();
  for (const row of barberRows ?? []) {
    barberNames.set(String(row.staff_user_id), localizedName(row.display_name, "Barber"));
  }

  const serviceNames = new Map<string, string>();
  for (const row of servicesResult.data ?? []) {
    serviceNames.set(String(row.id), localizedName(row.name, String(row.slug ?? "Service")));
  }

  const entries = rows.map((row) => {
    const id = String(row.id);
    const barberId = latestAssignment.get(id) ?? null;
    return {
      id,
      publicToken: String(row.public_token ?? ""),
      clientName: typeof row.client_name === "string" ? row.client_name : null,
      serviceName: row.service_id
        ? serviceNames.get(String(row.service_id)) ?? String(row.service_slug ?? "Service")
        : String(row.service_slug ?? "Service"),
      servicePriceCents: typeof row.service_price_snapshot_cents === "number" ? row.service_price_snapshot_cents : null,
      status: "completed",
      walkInAt: typeof row.walk_in_at === "string" ? row.walk_in_at : typeof row.joined_at === "string" ? row.joined_at : null,
      completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
      assignedBarberName: barberId ? barberNames.get(barberId) ?? "Assigned barber" : "Unassigned",
    };
  });

  const response = NextResponse.json({ ok: true, loungeDate: today, entries });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
