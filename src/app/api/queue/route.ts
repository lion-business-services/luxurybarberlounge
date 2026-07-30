import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { features } from "@/lib/config/features";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { estimateQueueWait } from "@/lib/queue/engine";
import { checkRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(7).max(40).optional(),
  service: z.string().trim().min(1).max(120),
  barber: z.string().trim().max(120).optional(),
  returning: z.union([z.string(), z.boolean()]).optional(),
  smsConsent: z.union([z.literal("yes"), z.literal("no"), z.boolean()]).optional(),
  company: z.string().optional(),
});

export async function POST(request: NextRequest) {
  if (!features.walkInQueue) return NextResponse.json({ message: "Digital walk-in check-in is not active. Please call or visit the lounge." }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!checkRateLimit(`queue:${ip}`, 6, 60_000).allowed) return NextResponse.json({ message: "Please wait before trying again." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Name, phone, and service are required." }, { status: 422 });
  if (parsed.data.company?.trim()) return NextResponse.json({ token: "PENDING", live: false }, { status: 201 });

  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ message: "Queue configuration is unavailable. Please call the lounge." }, { status: 503 });
  const session = await getServerAuthSession();
  const clientUserId = session.user && session.roles.includes("client") ? session.user.id : null;
  const { data: profile } = clientUserId ? await admin.from("profiles").select("full_name,phone").eq("id", clientUserId).maybeSingle() : { data: null };
  const name = parsed.data.name || profile?.full_name || "";
  const phone = parsed.data.phone || profile?.phone || "";
  if (name.trim().length < 2 || phone.trim().length < 7) return NextResponse.json({ message: "Confirm your name and phone before joining the queue." }, { status: 422 });

  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const { data: location } = business?.id ? await admin.from("locations").select("id").eq("business_id", business.id).eq("slug", "northfield").maybeSingle() : { data: null };
  if (!business?.id || !location?.id) return NextResponse.json({ message: "Queue configuration is incomplete. Please speak with reception." }, { status: 503 });

  const { data: service } = await admin.from("services").select("id,slug,duration_minutes").eq("business_id", business.id).eq("slug", parsed.data.service).eq("active", true).eq("bookable", true).maybeSingle();
  const duration = typeof service?.duration_minutes === "number" ? service.duration_minutes : 30;
  const duplicateQuery = admin.from("queue_entries").select("id,public_token,status,estimated_wait_minutes").eq("location_id", location.id).in("status", ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"]);
  const { data: existing } = clientUserId ? await duplicateQuery.eq("client_id", clientUserId).limit(1).maybeSingle() : await duplicateQuery.eq("client_phone", phone).limit(1).maybeSingle();
  if (existing?.id) return NextResponse.json({ token: existing.public_token, estimatedWait: existing.estimated_wait_minutes, live: true, duplicate: true, status: existing.status }, { status: 200 });

  const [{ data: queueRows }, { count: activeBarbers }, { count: scheduledBookings }, { data: serviceRows }] = await Promise.all([
    admin.from("queue_entries").select("service_id,service_slug,status,joined_at,manual_priority").eq("location_id", location.id).in("status", ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"]),
    admin.from("barber_profiles").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("active", true).eq("status", "published"),
    admin.from("square_bookings").select("id", { count: "exact", head: true }).eq("business_id", business.id).gte("starts_at", new Date().toISOString()).lt("starts_at", new Date(Date.now() + 90 * 60_000).toISOString()).in("status", ["ACCEPTED", "PENDING"]),
    admin.from("services").select("id,slug,duration_minutes").eq("business_id", business.id).eq("active", true),
  ]);
  const durations = new Map<string, number>();
  for (const row of serviceRows ?? []) {
    const minutes = typeof row.duration_minutes === "number" ? row.duration_minutes : 30;
    durations.set(String(row.id), minutes); durations.set(String(row.slug), minutes);
  }
  const waiting = (queueRows ?? []).map((row) => ({
    durationMinutes: durations.get(String(row.service_id ?? row.service_slug ?? "")) ?? 30,
    status: String(row.status) as "waiting" | "confirmed" | "checked_in" | "assigned" | "called" | "ready" | "in_service",
    priority: typeof row.manual_priority === "number" ? row.manual_priority : 100,
    joinedAt: String(row.joined_at),
  }));
  const estimate = estimateQueueWait({ waiting, serviceDurationMinutes: duration, availableBarbers: Math.max(1, activeBarbers ?? 0), scheduledLoadMinutes: (scheduledBookings ?? 0) * 30, bufferMinutes: 5 });
  const token = randomBytes(4).toString("hex").toUpperCase();
  const { data: inserted, error } = await admin.from("queue_entries").insert({
    business_id: business.id,
    location_id: location.id,
    client_id: clientUserId,
    public_token: token,
    status: "waiting",
    service_id: service?.id ?? null,
    service_slug: parsed.data.service,
    barber_preference: parsed.data.barber || "first-available",
    client_name: name.trim(),
    client_phone: phone.trim(),
    estimated_wait_minutes: estimate.estimatedWaitMinutes,
    metadata: { returning: parsed.data.returning ?? null, smsConsent: parsed.data.smsConsent === "yes" || parsed.data.smsConsent === true, estimate: true, estimate_basis: { active_queue: waiting.length, active_barbers: activeBarbers ?? 0, scheduled_bookings_90m: scheduledBookings ?? 0, service_minutes: duration } },
  }).select("id").single();
  if (error || !inserted?.id) return NextResponse.json({ message: "Queue service is temporarily unavailable. Please speak with reception." }, { status: 503 });
  await admin.from("queue_status_history").insert({ queue_entry_id: inserted.id, to_status: "waiting", changed_by: clientUserId, note: "Digital queue check-in" });
  await admin.from("audit_logs").insert({ business_id: business.id, actor_user_id: clientUserId, actor_role: clientUserId ? "client" : null, action: "queue_joined", resource_type: "queue_entry", resource_id: inserted.id, metadata: { source: clientUserId ? "client_portal" : "public_walk_in", estimate_minutes: estimate.estimatedWaitMinutes } });
  return NextResponse.json({ token, estimatedWait: estimate.estimatedWaitMinutes, live: true, estimate: true }, { status: 201 });
}
