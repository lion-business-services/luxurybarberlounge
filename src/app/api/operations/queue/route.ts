import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { selectNextAssignment, type AssignmentBarber, type QueueWorkItem } from "@/lib/queue/engine";

const allowed = new Set(["receptionist", "manager", "owner", "super_admin"]);

async function authorize() {
  const session = await getServerAuthSession();
  return session.user && session.roles.some((role) => allowed.has(role)) ? session : null;
}

async function businessContext() {
  const admin = createUntypedAdminSupabase();
  if (!admin) return null;
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) return null;
  const { data: location } = await admin.from("locations").select("id,name").eq("business_id", business.id).eq("slug", "northfield").maybeSingle();
  if (!location?.id) return null;
  return { admin, businessId: String(business.id), locationId: String(location.id), locationName: String(location.name ?? "Northfield") };
}

export async function GET() {
  if (!await authorize()) return NextResponse.json({ ok: false, message: "Operational access is required." }, { status: 403 });
  const context = await businessContext();
  if (!context) return NextResponse.json({ ok: true, live: false, entries: [], message: "Supabase queue operations are not active yet." });
  const { data, error } = await context.admin
    .from("queue_entries")
    .select("id,public_token,client_name,service_slug,service_id,barber_preference,preferred_barber_id,status,estimated_wait_minutes,manual_priority,joined_at,metadata")
    .eq("location_id", context.locationId)
    .in("status", ["waiting","confirmed","checked_in","assigned","called","ready","in_service"])
    .order("manual_priority", { ascending: true })
    .order("joined_at", { ascending: true });
  if (error) return NextResponse.json({ ok: false, message: "The live queue could not be loaded." }, { status: 503 });
  return NextResponse.json({ ok: true, live: true, location: context.locationName, entries: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await authorize();
  if (!session?.user) return NextResponse.json({ ok: false, message: "Operational access is required." }, { status: 403 });
  const context = await businessContext();
  if (!context) return NextResponse.json({ ok: false, message: "Supabase queue operations are not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { action?: string; entryId?: string; barberId?: string; status?: string; reason?: string } | null;
  if (!body?.action) return NextResponse.json({ ok: false, message: "An action is required." }, { status: 400 });

  if (body.action === "set_status") {
    const allowedStatuses = new Set(["waiting","confirmed","checked_in","assigned","called","ready","in_service","completed","cancelled","removed","no_show"]);
    if (!body.entryId || !body.status || !allowedStatuses.has(body.status)) return NextResponse.json({ ok: false, message: "A valid queue status is required." }, { status: 400 });
    const { data: current } = await context.admin.from("queue_entries").select("status").eq("id", body.entryId).eq("business_id", context.businessId).maybeSingle();
    if (!current) return NextResponse.json({ ok: false, message: "Queue entry not found." }, { status: 404 });
    const { error } = await context.admin.from("queue_entries").update({ status: body.status, ...(body.status === "in_service" ? { service_started_at: new Date().toISOString() } : {}), ...(body.status === "completed" ? { completed_at: new Date().toISOString() } : {}) }).eq("id", body.entryId);
    if (error) return NextResponse.json({ ok: false, message: "The queue status could not be updated." }, { status: 500 });
    await context.admin.from("queue_status_history").insert({ queue_entry_id: body.entryId, from_status: current.status, to_status: body.status, changed_by: session.user.id, note: body.reason?.slice(0, 500) ?? null });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "assign") {
    if (!body.entryId || !body.barberId) return NextResponse.json({ ok: false, message: "Queue entry and Barber are required." }, { status: 400 });
    await context.admin.from("queue_assignments").update({ active: false, released_at: new Date().toISOString() }).eq("queue_entry_id", body.entryId).eq("active", true);
    const { error } = await context.admin.from("queue_assignments").insert({ queue_entry_id: body.entryId, barber_user_id: body.barberId, assigned_by: session.user.id, reason: body.reason?.slice(0, 500) || "Manual reception assignment", assignment_source: session.roles.includes("owner") ? "owner" : session.roles.includes("manager") ? "manager" : "reception", explanation: { manual: true } });
    if (error) return NextResponse.json({ ok: false, message: "The assignment could not be saved." }, { status: 500 });
    await context.admin.from("queue_entries").update({ status: "assigned" }).eq("id", body.entryId);
    await context.admin.from("queue_status_history").insert({ queue_entry_id: body.entryId, to_status: "assigned", changed_by: session.user.id, note: body.reason?.slice(0, 500) || "Manual assignment" });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "who_next") {
    const now = new Date().toISOString();
    const { data: entryRows } = await context.admin.from("queue_entries").select("id,status,manual_priority,joined_at,preferred_barber_id,service_id,metadata").eq("location_id", context.locationId).in("status", ["waiting","confirmed","checked_in"]);
    const { data: staffRows } = await context.admin.from("staff_profiles").select("user_id,active").eq("business_id", context.businessId).eq("active", true);
    const { data: serviceRows } = await context.admin.from("staff_services").select("staff_user_id,service_id").eq("active", true);
    const { data: activeAssignments } = await context.admin.from("queue_assignments").select("barber_user_id,queue_entries!inner(status,service_id)").eq("active", true).in("queue_entries.status", ["assigned","called","ready","in_service"]);
    const servicesByBarber = new Map<string, string[]>();
    for (const row of serviceRows ?? []) {
      const id = String(row.staff_user_id);
      servicesByBarber.set(id, [...(servicesByBarber.get(id) ?? []), String(row.service_id)]);
    }
    const load = new Map<string, number>();
    for (const row of activeAssignments ?? []) load.set(String(row.barber_user_id), (load.get(String(row.barber_user_id)) ?? 0) + 30);
    const barbers: AssignmentBarber[] = (staffRows ?? []).map((row) => ({ id: String(row.user_id), eligibleServiceIds: servicesByBarber.get(String(row.user_id)) ?? [], availableAt: now, activeLoadMinutes: load.get(String(row.user_id)) ?? 0, acceptingWalkIns: true }));
    const entries: QueueWorkItem[] = (entryRows ?? []).map((row) => {
      const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
      return { id: String(row.id), status: row.status as QueueWorkItem["status"], durationMinutes: 30, priority: Number(row.manual_priority ?? 100), joinedAt: String(row.joined_at), appointmentAt: typeof metadata.appointmentAt === "string" ? metadata.appointmentAt : null, preferredBarberId: row.preferred_barber_id ? String(row.preferred_barber_id) : null, serviceId: row.service_id ? String(row.service_id) : null };
    });
    const { data: activeRule } = await context.admin.from("assignment_rule_versions").select("id,version").eq("business_id", context.businessId).eq("status", "active").order("version", { ascending: false }).limit(1).maybeSingle();
    const decision = selectNextAssignment({ entries, barbers, now, ruleVersion: activeRule?.version ? String(activeRule.version) : "default-1" });
    if (!decision) return NextResponse.json({ ok: false, message: "No eligible queue entry and Barber pairing is available." }, { status: 409 });
    const { data: existing } = await context.admin.from("queue_assignments").select("id").eq("queue_entry_id", decision.queueEntryId).eq("active", true).maybeSingle();
    if (existing) return NextResponse.json({ ok: true, duplicate: true, decision });
    const { error } = await context.admin.from("queue_assignments").insert({ queue_entry_id: decision.queueEntryId, barber_user_id: decision.barberId, assigned_by: session.user.id, reason: decision.reasons.join("; "), assignment_source: "automatic", explanation: { score: decision.score, reasons: decision.reasons, ruleVersion: decision.ruleVersion }, rule_version_id: activeRule?.id ?? null });
    if (error) return NextResponse.json({ ok: false, message: "The automatic assignment could not be saved." }, { status: 500 });
    await context.admin.from("queue_entries").update({ status: "assigned" }).eq("id", decision.queueEntryId);
    await context.admin.from("queue_status_history").insert({ queue_entry_id: decision.queueEntryId, to_status: "assigned", changed_by: session.user.id, note: `Automatic assignment: ${decision.reasons.join("; ")}` });
    return NextResponse.json({ ok: true, decision });
  }

  return NextResponse.json({ ok: false, message: "Unsupported queue action." }, { status: 400 });
}
