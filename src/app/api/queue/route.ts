import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { features } from "@/lib/config/features";
import { getServerAuthSession } from "@/lib/auth/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  assignNextQueueEntry,
  createPublicDisplayLabel,
  getQueueContext,
  loadOperationalQueue,
  recalculateQueueWaits,
} from "@/lib/queue/operations";

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(7).max(40).optional(),
  service: z.string().trim().min(1).max(120),
  barber: z.string().trim().max(120).optional(),
  returning: z.union([z.string(), z.boolean()]).optional(),
  smsConsent: z.union([z.literal("yes"), z.literal("no"), z.boolean()]).optional(),
  publicDisplayConsent: z.union([z.literal("yes"), z.literal("no"), z.boolean()]).optional(),
  company: z.string().optional(),
});

export async function POST(request: NextRequest) {
  if (!features.walkInQueue) {
    return NextResponse.json({ message: "Digital walk-in check-in is not active. Please call or visit the lounge." }, { status: 503 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!checkRateLimit(`queue:${ip}`, 6, 60_000).allowed) {
    return NextResponse.json({ message: "Please wait before trying again." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Name, phone, and service are required." }, { status: 422 });
  if (parsed.data.company?.trim()) return NextResponse.json({ token: "PENDING", live: false }, { status: 201 });

  const context = await getQueueContext();
  if (!context) return NextResponse.json({ message: "Queue configuration is unavailable. Please call the lounge." }, { status: 503 });
  const session = await getServerAuthSession();
  const clientUserId = session.user && session.roles.includes("client") ? session.user.id : null;
  const { data: profile } = clientUserId
    ? await context.admin.from("profiles").select("full_name,display_name,phone").eq("id", clientUserId).maybeSingle()
    : { data: null };
  const name = parsed.data.name || profile?.display_name || profile?.full_name || "";
  const phone = parsed.data.phone || profile?.phone || "";
  if (name.trim().length < 2 || phone.trim().length < 7) {
    return NextResponse.json({ message: "Confirm your name and phone before joining the queue." }, { status: 422 });
  }

  const { data: service } = await context.admin
    .from("services")
    .select("id,slug,duration_minutes")
    .eq("business_id", context.businessId)
    .eq("slug", parsed.data.service)
    .eq("active", true)
    .eq("bookable", true)
    .maybeSingle();
  if (!service?.id) return NextResponse.json({ message: "Choose an available service before joining the queue." }, { status: 422 });

  const duplicateQuery = context.admin
    .from("queue_entries")
    .select("id,public_token,status,estimated_wait_minutes")
    .eq("location_id", context.locationId)
    .in("status", ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"]);
  const { data: existing } = clientUserId
    ? await duplicateQuery.eq("client_id", clientUserId).limit(1).maybeSingle()
    : await duplicateQuery.eq("client_phone", phone).limit(1).maybeSingle();
  if (existing?.id) {
    return NextResponse.json({ token: existing.public_token, estimatedWait: existing.estimated_wait_minutes, live: true, duplicate: true, status: existing.status });
  }

  const token = randomBytes(4).toString("hex").toUpperCase();
  const displayConsent = parsed.data.publicDisplayConsent === "yes" || parsed.data.publicDisplayConsent === true;
  const publicDisplayLabel = displayConsent ? createPublicDisplayLabel(name) : null;
  const { data: inserted, error } = await context.admin.from("queue_entries").insert({
    business_id: context.businessId,
    location_id: context.locationId,
    client_id: clientUserId,
    public_token: token,
    status: "waiting",
    service_id: service.id,
    service_slug: service.slug,
    barber_preference: parsed.data.barber || "first-available",
    client_name: name.trim(),
    client_phone: phone.trim(),
    estimated_wait_minutes: null,
    public_display_consent: displayConsent,
    public_display_label: publicDisplayLabel,
    metadata: {
      returning: parsed.data.returning ?? null,
      smsConsent: parsed.data.smsConsent === "yes" || parsed.data.smsConsent === true,
      source: clientUserId ? "client_portal" : "public_walk_in",
    },
  }).select("id").single();
  if (error || !inserted?.id) {
    return NextResponse.json({ message: "Queue service is temporarily unavailable. Please speak with reception." }, { status: 503 });
  }

  await Promise.all([
    context.admin.from("queue_status_history").insert({ queue_entry_id: inserted.id, to_status: "waiting", changed_by: clientUserId, note: "Digital queue check-in" }),
    context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: clientUserId, actor_role: clientUserId ? "client" : null, action: "queue_joined", resource_type: "queue_entry", resource_id: inserted.id, metadata: { source: clientUserId ? "client_portal" : "public_walk_in", public_display_consent: displayConsent } }),
  ]);

  const refreshed = await recalculateQueueWaits(context);
  await assignNextQueueEntry(context, clientUserId).catch(() => null);
  const row = refreshed.entries.find((entry) => entry.id === inserted.id);
  return NextResponse.json({ token, estimatedWait: row?.estimatedWaitMinutes ?? null, live: true, estimate: true }, { status: 201 });
}
