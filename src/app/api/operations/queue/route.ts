import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth/server";
import { localizedName } from "@/lib/portal/format";
import { enqueueQueueStatusNotification } from "@/lib/queue/notifications";
import {
  activeQueueStatuses,
  assignNextQueueEntry,
  getQueueContext,
  loadOperationalQueue,
  recalculateQueueWaits,
  terminalQueueStatuses,
} from "@/lib/queue/operations";

const allowed = new Set(["receptionist", "manager", "owner", "super_admin"]);

async function authorize() {
  const session = await getServerAuthSession();
  return session.user && session.roles.some((role) => allowed.has(role)) ? session : null;
}

export async function GET() {
  if (!await authorize()) return NextResponse.json({ ok: false, message: "Operational access is required." }, { status: 403 });
  const context = await getQueueContext();
  if (!context) return NextResponse.json({ ok: true, live: false, entries: [], barbers: [], message: "Supabase queue operations are not active yet." });
  try {
    const data = await recalculateQueueWaits(context);
    return NextResponse.json({ ok: true, live: true, location: context.locationName, entries: data.entries, barbers: data.barbers });
  } catch {
    return NextResponse.json({ ok: false, message: "The live queue could not be loaded. Apply the latest Supabase migration and retry." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await authorize();
  if (!session?.user) return NextResponse.json({ ok: false, message: "Operational access is required." }, { status: 403 });
  const context = await getQueueContext();
  if (!context) return NextResponse.json({ ok: false, message: "Supabase queue operations are not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { action?: string; entryId?: string; barberId?: string; status?: string; reason?: string } | null;
  if (!body?.action) return NextResponse.json({ ok: false, message: "An action is required." }, { status: 400 });

  if (body.action === "recalculate") {
    const data = await recalculateQueueWaits(context);
    return NextResponse.json({ ok: true, entries: data.entries });
  }

  if (body.action === "who_next") {
    const result = await assignNextQueueEntry(context, session.user.id);
    if (!result) return NextResponse.json({ ok: false, message: "No eligible waiting guest and available barber pairing is ready yet." }, { status: 409 });
    return NextResponse.json({ ok: true, decision: result.decision, duplicate: result.duplicate });
  }

  if (body.action === "set_status") {
    const allowedStatuses = new Set<string>([...activeQueueStatuses, ...terminalQueueStatuses]);
    if (!body.entryId || !body.status || !allowedStatuses.has(body.status)) {
      return NextResponse.json({ ok: false, message: "A valid queue status is required." }, { status: 400 });
    }
    const { data: current } = await context.admin.from("queue_entries").select("id,status,client_id,client_phone,estimated_wait_minutes,metadata,appointment_id").eq("id", body.entryId).eq("business_id", context.businessId).maybeSingle();
    if (!current) return NextResponse.json({ ok: false, message: "Queue entry not found." }, { status: 404 });
    const terminal = terminalQueueStatuses.includes(body.status as (typeof terminalQueueStatuses)[number]);
    const update = {
      status: body.status,
      ...(body.status === "called" ? { called_at: new Date().toISOString() } : {}),
      ...(body.status === "in_service" ? { service_started_at: new Date().toISOString(), estimated_wait_minutes: 0 } : {}),
      ...(body.status === "completed" ? { completed_at: new Date().toISOString(), estimated_wait_minutes: 0 } : {}),
    };
    const { error } = await context.admin.from("queue_entries").update(update).eq("id", body.entryId).eq("business_id", context.businessId);
    if (error) return NextResponse.json({ ok: false, message: "The queue status could not be updated." }, { status: 500 });
    if (terminal) {
      await context.admin.from("queue_assignments").update({ active: false, released_at: new Date().toISOString() }).eq("queue_entry_id", body.entryId).eq("active", true);
    }
    await Promise.all([
      context.admin.from("queue_status_history").insert({ queue_entry_id: body.entryId, from_status: current.status, to_status: body.status, changed_by: session.user.id, note: body.reason?.slice(0, 500) ?? null }),
      context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: session.user.id, actor_role: session.roles[0] ?? null, action: "queue_status_changed", resource_type: "queue_entry", resource_id: body.entryId, before_data: { status: current.status }, after_data: { status: body.status }, reason: body.reason?.slice(0, 500) ?? null, metadata: {} }),
    ]);
    if (current.appointment_id) {
      const appointmentStatus = body.status === "in_service" ? "in_service" : body.status === "completed" ? "completed" : body.status === "no_show" ? "no_show" : ["called", "ready", "assigned"].includes(body.status) ? "assigned" : ["cancelled", "removed"].includes(body.status) ? "cancelled_by_business" : null;
      if (appointmentStatus) {
        const { data: appointment } = await context.admin.from("appointments").select("status").eq("id", current.appointment_id).maybeSingle();
        if (appointment?.status !== appointmentStatus) {
          const updated = await context.admin.from("appointments").update({ status: appointmentStatus }).eq("id", current.appointment_id);
          if (!updated.error) await context.admin.from("appointment_status_history").insert({ appointment_id: current.appointment_id, booking_metadata_id: null, from_status: appointment?.status ?? null, to_status: appointmentStatus, changed_by: session.user.id, reason: `Queue status changed to ${body.status}`, metadata: { source: "queue_operations", queue_entry_id: body.entryId } });
        }
      }
    }
    const refreshed = await recalculateQueueWaits(context);
    if (["called", "ready"].includes(body.status)) {
      const { data: assignment } = await context.admin.from("queue_assignments").select("barber_user_id").eq("queue_entry_id", body.entryId).eq("active", true).maybeSingle();
      let barberName: string | null = null;
      if (assignment?.barber_user_id) {
        const { data: barberProfile } = await context.admin.from("barber_profiles").select("display_name").eq("staff_user_id", assignment.barber_user_id).maybeSingle();
        barberName = barberProfile ? localizedName(barberProfile.display_name, "your barber") : null;
      }
      const refreshedEntry = refreshed.entries.find((entry) => entry.id === body.entryId);
      await enqueueQueueStatusNotification(context.admin, {
        businessId: context.businessId,
        entryId: body.entryId,
        clientId: current.client_id ? String(current.client_id) : null,
        clientPhone: typeof current.client_phone === "string" ? current.client_phone : null,
        smsConsent: Boolean(current.metadata && typeof current.metadata === "object" && (current.metadata as Record<string, unknown>).smsConsent === true),
        status: body.status as "called" | "ready",
        barberName,
        estimatedWaitMinutes: refreshedEntry?.estimatedWaitMinutes ?? null,
      }).catch(() => null);
    }
    if (terminal) await assignNextQueueEntry(context, session.user.id).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "assign") {
    if (!body.entryId || !body.barberId) return NextResponse.json({ ok: false, message: "Queue entry and barber are required." }, { status: 400 });
    const [{ data: entry }, { data: barber }] = await Promise.all([
      context.admin.from("queue_entries").select("id,status,appointment_id").eq("business_id", context.businessId).eq("id", body.entryId).maybeSingle(),
      context.admin.from("barber_profiles").select("staff_user_id,active,accepting_walk_ins,display_name").eq("business_id", context.businessId).eq("staff_user_id", body.barberId).eq("active", true).maybeSingle(),
    ]);
    if (!entry?.id || !barber?.staff_user_id) return NextResponse.json({ ok: false, message: "The queue entry or active barber is unavailable." }, { status: 404 });
    await context.admin.from("queue_assignments").update({ active: false, released_at: new Date().toISOString() }).eq("queue_entry_id", body.entryId).eq("active", true);
    const source = session.roles.includes("owner") || session.roles.includes("super_admin") ? "owner" : session.roles.includes("manager") ? "manager" : "reception";
    const { data: assignment, error } = await context.admin.from("queue_assignments").insert({ queue_entry_id: body.entryId, barber_user_id: body.barberId, assigned_by: session.user.id, reason: body.reason?.slice(0, 500) || "Manual shop assignment", assignment_source: source, explanation: { manual: true } }).select("id").single();
    if (error || !assignment?.id) return NextResponse.json({ ok: false, message: "The assignment could not be saved." }, { status: 500 });
    await Promise.all([
      context.admin.from("queue_entries").update({ status: "assigned" }).eq("id", body.entryId),
      context.admin.from("queue_status_history").insert({ queue_entry_id: body.entryId, from_status: entry.status, to_status: "assigned", changed_by: session.user.id, note: body.reason?.slice(0, 500) || "Manual assignment" }),
      context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: session.user.id, actor_role: session.roles[0] ?? null, action: "queue_manually_assigned", resource_type: "queue_assignment", resource_id: assignment.id, before_data: { queue_status: entry.status }, after_data: { queue_entry_id: body.entryId, barber_user_id: body.barberId, queue_status: "assigned" }, reason: body.reason?.slice(0, 500) || "Manual assignment", metadata: {} }),
    ]);
    if (entry.appointment_id) {
      const { data: appointment } = await context.admin.from("appointments").select("status").eq("id", entry.appointment_id).maybeSingle();
      if (appointment?.status !== "assigned") {
        const updated = await context.admin.from("appointments").update({ status: "assigned", assigned_staff_user_id: body.barberId }).eq("id", entry.appointment_id);
        if (!updated.error) await context.admin.from("appointment_status_history").insert({ appointment_id: entry.appointment_id, booking_metadata_id: null, from_status: appointment?.status ?? null, to_status: "assigned", changed_by: session.user.id, reason: "Assigned through queue operations", metadata: { queue_entry_id: body.entryId } });
      }
    }
    const refreshed = await recalculateQueueWaits(context);
    const { data: entryContact } = await context.admin.from("queue_entries").select("client_id,client_phone,metadata").eq("id", body.entryId).maybeSingle();
    const refreshedEntry = refreshed.entries.find((item) => item.id === body.entryId);
    await enqueueQueueStatusNotification(context.admin, {
      businessId: context.businessId,
      entryId: body.entryId,
      clientId: entryContact?.client_id ? String(entryContact.client_id) : null,
      clientPhone: typeof entryContact?.client_phone === "string" ? entryContact.client_phone : null,
      smsConsent: Boolean(entryContact?.metadata && typeof entryContact.metadata === "object" && (entryContact.metadata as Record<string, unknown>).smsConsent === true),
      status: "assigned",
      barberName: localizedName(barber.display_name, "your barber"),
      estimatedWaitMinutes: refreshedEntry?.estimatedWaitMinutes ?? null,
    }).catch(() => null);
    return NextResponse.json({ ok: true, assignmentId: assignment.id });
  }

  return NextResponse.json({ ok: false, message: "Unsupported queue action." }, { status: 400 });
}
