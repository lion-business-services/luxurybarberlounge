import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { estimateQueueWait, selectNextAssignment, type AssignmentBarber, type QueueWorkItem } from "./engine";
import { enqueueQueueStatusNotification } from "./notifications";
import { dateInZone, zonedDateTimeToUtc } from "@/lib/booking/timezone";

export const activeQueueStatuses = ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"] as const;
export const assignableQueueStatuses = ["waiting", "confirmed", "checked_in"] as const;
export const terminalQueueStatuses = ["completed", "cancelled", "removed", "no_show"] as const;

type AdminClient = SupabaseClient;

type QueueContext = {
  admin: AdminClient;
  businessId: string;
  locationId: string;
  locationName: string;
};

export type OperationalBarber = {
  userId: string;
  profileId: string;
  displayName: string;
  acceptingWalkIns: boolean;
  availabilityStatus: string;
};

export type OperationalQueueEntry = {
  id: string;
  appointmentId: string | null;
  publicToken: string;
  clientName: string | null;
  clientId: string | null;
  clientPhone: string | null;
  smsConsent: boolean;
  serviceId: string | null;
  serviceSlug: string | null;
  serviceName: string;
  barberPreference: string | null;
  preferredBarberId: string | null;
  status: string;
  estimatedWaitMinutes: number | null;
  manualPriority: number;
  joinedAt: string;
  publicDisplayConsent: boolean;
  publicDisplayLabel: string | null;
  assignedBarberId: string | null;
  assignedBarberName: string | null;
};

function localizedName(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    for (const key of ["en", "es"]) {
      if (typeof map[key] === "string" && String(map[key]).trim()) return String(map[key]).trim();
    }
  }
  return fallback;
}

export function privacySafeQueueLabel(input: {
  token: string;
  consent?: boolean | null;
  label?: string | null;
}) {
  if (input.consent && input.label?.trim()) return input.label.trim().slice(0, 40);
  const suffix = input.token.replace(/[^A-Z0-9]/gi, "").slice(-4).toUpperCase() || "WAIT";
  return `Guest ${suffix}`;
}

export function createPublicDisplayLabel(name: string) {
  const clean = name.trim().replace(/\s+/g, " ");
  const parts = clean.split(" ").filter(Boolean);
  if (!parts.length) return null;
  const first = parts[0].slice(0, 24);
  const lastInitial = parts.length > 1 ? `${parts.at(-1)?.slice(0, 1).toUpperCase()}.` : "";
  return `${first}${lastInitial ? ` ${lastInitial}` : ""}`.slice(0, 40);
}

export async function getQueueContext(): Promise<QueueContext | null> {
  const admin = createUntypedAdminSupabase() as AdminClient | null;
  if (!admin) return null;
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) return null;
  const { data: location } = await admin.from("locations").select("id,name").eq("business_id", business.id).eq("slug", "northfield").maybeSingle();
  if (!location?.id) return null;
  return {
    admin,
    businessId: String(business.id),
    locationId: String(location.id),
    locationName: localizedName(location.name, "Northfield"),
  };
}

export async function loadOperationalQueue(context: QueueContext) {
  const [{ data: entryRows, error }, { data: assignmentRows }, { data: barberRows }, { data: serviceRows }] = await Promise.all([
    context.admin
      .from("queue_entries")
      .select("id,appointment_id,public_token,client_id,client_name,client_phone,service_slug,service_id,barber_preference,preferred_barber_id,status,estimated_wait_minutes,manual_priority,joined_at,public_display_consent,public_display_label,metadata")
      .eq("location_id", context.locationId)
      .in("status", [...activeQueueStatuses])
      .order("manual_priority", { ascending: true })
      .order("joined_at", { ascending: true }),
    context.admin.from("queue_assignments").select("queue_entry_id,barber_user_id,assigned_at").eq("active", true),
    context.admin
      .from("barber_profiles")
      .select("id,staff_user_id,display_name,active,status,accepting_walk_ins,availability_status")
      .eq("business_id", context.businessId)
      .eq("active", true)
      .neq("status", "archived"),
    context.admin.from("services").select("id,slug,name,duration_minutes").eq("business_id", context.businessId),
  ]);
  if (error) throw error;

  const barberMap = new Map<string, OperationalBarber>();
  for (const row of barberRows ?? []) {
    if (!row.staff_user_id) continue;
    barberMap.set(String(row.staff_user_id), {
      userId: String(row.staff_user_id),
      profileId: String(row.id),
      displayName: localizedName(row.display_name, "Barber"),
      acceptingWalkIns: row.accepting_walk_ins !== false,
      availabilityStatus: String(row.availability_status ?? "available"),
    });
  }
  const assignmentMap = new Map<string, { barberId: string; name: string | null }>();
  for (const row of assignmentRows ?? []) {
    const barberId = String(row.barber_user_id);
    assignmentMap.set(String(row.queue_entry_id), { barberId, name: barberMap.get(barberId)?.displayName ?? null });
  }
  const serviceMap = new Map<string, { name: string; duration: number }>();
  for (const row of serviceRows ?? []) {
    const item = { name: localizedName(row.name, String(row.slug ?? "Service")), duration: typeof row.duration_minutes === "number" ? row.duration_minutes : 30 };
    serviceMap.set(String(row.id), item);
    serviceMap.set(String(row.slug), item);
  }

  const entries: OperationalQueueEntry[] = (entryRows ?? []).map((row) => {
    const assignment = assignmentMap.get(String(row.id));
    const service = serviceMap.get(String(row.service_id ?? row.service_slug ?? ""));
    return {
      id: String(row.id),
      appointmentId: row.appointment_id ? String(row.appointment_id) : null,
      publicToken: String(row.public_token),
      clientName: typeof row.client_name === "string" ? row.client_name : null,
      clientId: row.client_id ? String(row.client_id) : null,
      clientPhone: typeof row.client_phone === "string" ? row.client_phone : null,
      smsConsent: Boolean(row.metadata && typeof row.metadata === "object" && (row.metadata as Record<string, unknown>).smsConsent === true),
      serviceId: row.service_id ? String(row.service_id) : null,
      serviceSlug: row.service_slug ? String(row.service_slug) : null,
      serviceName: service?.name ?? String(row.service_slug ?? "Service"),
      barberPreference: row.barber_preference ? String(row.barber_preference) : null,
      preferredBarberId: row.preferred_barber_id ? String(row.preferred_barber_id) : null,
      status: String(row.status),
      estimatedWaitMinutes: typeof row.estimated_wait_minutes === "number" ? row.estimated_wait_minutes : null,
      manualPriority: typeof row.manual_priority === "number" ? row.manual_priority : 100,
      joinedAt: String(row.joined_at),
      publicDisplayConsent: Boolean(row.public_display_consent),
      publicDisplayLabel: typeof row.public_display_label === "string" ? row.public_display_label : null,
      assignedBarberId: assignment?.barberId ?? null,
      assignedBarberName: assignment?.name ?? null,
    };
  });
  return { entries, barbers: [...barberMap.values()], serviceMap };
}


export type UnifiedQueueDisplayEntry = {
  kind: "walk_in" | "appointment";
  sourceId: string;
  position: number;
  label: string;
  token: string;
  barber: string;
  service: string;
  status: string;
  estimatedWaitMinutes: number | null;
  scheduledAt: string | null;
};

/**
 * Builds the shop-TV snapshot from both active walk-ins and today's live
 * appointments. Appointment-only rows use the public booking reference, never
 * client PII, and are de-duplicated when an appointment already has a queue row.
 */
export async function loadUnifiedQueueDisplay(context: QueueContext): Promise<UnifiedQueueDisplayEntry[]> {
  const { entries } = await loadOperationalQueue(context);
  const today = dateInZone(new Date(), "America/New_York");
  const dayStart = zonedDateTimeToUtc(today, "00:00:00", "America/New_York");
  const dayEnd = zonedDateTimeToUtc(today, "23:59:59", "America/New_York");
  const { data: appointmentRows, error } = await context.admin
    .from("appointments")
    .select("id,public_reference,barber_name_snapshot,service_name_snapshot,status,starts_at")
    .eq("business_id", context.businessId)
    .eq("location_id", context.locationId)
    .gte("starts_at", dayStart.toISOString())
    .lte("starts_at", dayEnd.toISOString())
    .in("status", ["confirmed", "rescheduled", "checked_in", "assigned", "in_service"])
    .order("starts_at", { ascending: true });
  if (error) throw error;

  const linkedAppointments = new Set(entries.map((entry) => entry.appointmentId).filter((id): id is string => Boolean(id)));
  const rows: Omit<UnifiedQueueDisplayEntry, "position">[] = entries.map((entry) => ({
    kind: entry.appointmentId ? "appointment" : "walk_in",
    sourceId: entry.id,
    label: privacySafeQueueLabel({ token: entry.publicToken, consent: entry.publicDisplayConsent, label: entry.publicDisplayLabel }),
    token: entry.publicToken.slice(-4).toUpperCase(),
    barber: entry.assignedBarberName ?? (entry.barberPreference && entry.barberPreference !== "first-available" ? entry.barberPreference : "First available"),
    service: entry.serviceName,
    status: entry.status,
    estimatedWaitMinutes: entry.estimatedWaitMinutes,
    scheduledAt: null,
  }));

  for (const appointment of appointmentRows ?? []) {
    const id = String(appointment.id);
    if (linkedAppointments.has(id)) continue;
    const reference = String(appointment.public_reference ?? id);
    const suffix = reference.replace(/[^A-Z0-9]/gi, "").slice(-4).toUpperCase() || "APPT";
    rows.push({
      kind: "appointment",
      sourceId: id,
      label: `Appointment ${suffix}`,
      token: suffix,
      barber: String(appointment.barber_name_snapshot ?? "Assigned barber"),
      service: String(appointment.service_name_snapshot ?? "Service"),
      status: appointment.status === "rescheduled" ? "confirmed" : String(appointment.status ?? "confirmed"),
      estimatedWaitMinutes: null,
      scheduledAt: typeof appointment.starts_at === "string" ? appointment.starts_at : null,
    });
  }

  const rank = (status: string) => ["in_service", "ready", "called", "assigned", "checked_in", "waiting", "confirmed"].indexOf(status);
  rows.sort((a, b) => {
    const aRank = rank(a.status);
    const bRank = rank(b.status);
    const normalizedA = aRank < 0 ? 99 : aRank;
    const normalizedB = bRank < 0 ? 99 : bRank;
    if (normalizedA !== normalizedB) return normalizedA - normalizedB;
    if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
    if (a.scheduledAt) return 1;
    if (b.scheduledAt) return -1;
    return 0;
  });

  return rows.map((entry, index) => ({ ...entry, position: index + 1 }));
}

export async function recalculateQueueWaits(context: QueueContext) {
  const { entries, barbers, serviceMap } = await loadOperationalQueue(context);
  const availableBarbers = Math.max(1, barbers.filter((barber) => barber.acceptingWalkIns && barber.availabilityStatus !== "off_duty").length);
  const waiting = entries.map((entry) => ({
    id: entry.id,
    durationMinutes: serviceMap.get(String(entry.serviceId ?? entry.serviceSlug ?? ""))?.duration ?? 30,
    status: entry.status as QueueWorkItem["status"],
    priority: entry.manualPriority,
    joinedAt: entry.joinedAt,
  }));

  let workAhead: QueueWorkItem[] = [];
  for (const entry of entries) {
    if (["in_service", "called", "ready"].includes(entry.status)) {
      await context.admin.from("queue_entries").update({ estimated_wait_minutes: 0 }).eq("id", entry.id);
      continue;
    }
    const duration = serviceMap.get(String(entry.serviceId ?? entry.serviceSlug ?? ""))?.duration ?? 30;
    const estimate = estimateQueueWait({ waiting: workAhead, serviceDurationMinutes: duration, availableBarbers, bufferMinutes: workAhead.length ? 5 : 0 });
    await context.admin.from("queue_entries").update({ estimated_wait_minutes: estimate.estimatedWaitMinutes }).eq("id", entry.id);
    workAhead = [...workAhead, waiting.find((item) => item.id === entry.id) ?? { id: entry.id, status: entry.status as QueueWorkItem["status"], durationMinutes: duration }];
  }
  return loadOperationalQueue(context);
}

export async function assignNextQueueEntry(context: QueueContext, actorUserId: string | null) {
  const now = new Date().toISOString();
  const [{ entries, barbers, serviceMap }, { data: serviceEligibility }, { data: activeAssignments }, { data: activeRule }] = await Promise.all([
    loadOperationalQueue(context),
    context.admin.from("staff_services").select("staff_user_id,service_id").eq("active", true),
    context.admin.from("queue_assignments").select("barber_user_id,queue_entry_id").eq("active", true),
    context.admin.from("assignment_rule_versions").select("id,version").eq("business_id", context.businessId).eq("status", "active").order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const servicesByBarber = new Map<string, string[]>();
  for (const row of serviceEligibility ?? []) {
    const id = String(row.staff_user_id);
    servicesByBarber.set(id, [...(servicesByBarber.get(id) ?? []), String(row.service_id)]);
  }
  const loadByBarber = new Map<string, number>();
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  for (const assignment of activeAssignments ?? []) {
    const entry = entryById.get(String(assignment.queue_entry_id));
    const duration = entry ? serviceMap.get(String(entry.serviceId ?? entry.serviceSlug ?? ""))?.duration ?? 30 : 30;
    const barberId = String(assignment.barber_user_id);
    loadByBarber.set(barberId, (loadByBarber.get(barberId) ?? 0) + duration);
  }

  const candidates: AssignmentBarber[] = barbers.map((barber) => ({
    id: barber.userId,
    eligibleServiceIds: servicesByBarber.get(barber.userId) ?? [],
    availableAt: now,
    activeLoadMinutes: loadByBarber.get(barber.userId) ?? 0,
    acceptingWalkIns: barber.acceptingWalkIns && !["off_duty", "unavailable"].includes(barber.availabilityStatus),
  }));
  const workItems: QueueWorkItem[] = entries.map((entry) => ({
    id: entry.id,
    status: entry.status as QueueWorkItem["status"],
    durationMinutes: serviceMap.get(String(entry.serviceId ?? entry.serviceSlug ?? ""))?.duration ?? 30,
    priority: entry.manualPriority,
    joinedAt: entry.joinedAt,
    preferredBarberId: entry.preferredBarberId,
    serviceId: entry.serviceId,
  }));
  const decision = selectNextAssignment({ entries: workItems, barbers: candidates, now, ruleVersion: activeRule?.version ? String(activeRule.version) : "1" });
  if (!decision) return null;
  const { data: existing } = await context.admin.from("queue_assignments").select("id").eq("queue_entry_id", decision.queueEntryId).eq("active", true).maybeSingle();
  if (existing?.id) return { decision, duplicate: true };

  const sourceEntry = entryById.get(decision.queueEntryId);
  const { data: assignment, error } = await context.admin.from("queue_assignments").insert({
    queue_entry_id: decision.queueEntryId,
    barber_user_id: decision.barberId,
    assigned_by: actorUserId,
    reason: decision.reasons.join("; "),
    assignment_source: "automatic",
    explanation: { score: decision.score, reasons: decision.reasons, ruleVersion: decision.ruleVersion },
    rule_version_id: activeRule?.id ?? null,
  }).select("id").single();
  if (error || !assignment?.id) throw error ?? new Error("Automatic assignment could not be saved.");

  await Promise.all([
    context.admin.from("queue_entries").update({ status: "assigned" }).eq("id", decision.queueEntryId),
    context.admin.from("queue_status_history").insert({ queue_entry_id: decision.queueEntryId, from_status: sourceEntry?.status ?? null, to_status: "assigned", changed_by: actorUserId, note: `Automatic assignment: ${decision.reasons.join("; ")}` }),
    context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: actorUserId, actor_role: actorUserId ? "owner" : "system", action: "queue_automatically_assigned", resource_type: "queue_assignment", resource_id: assignment.id, before_data: { queue_status: sourceEntry?.status ?? null }, after_data: { queue_entry_id: decision.queueEntryId, barber_user_id: decision.barberId, score: decision.score, rule_version: decision.ruleVersion }, reason: decision.reasons.join("; "), metadata: {} }),
  ]);
  const refreshed = await recalculateQueueWaits(context);
  const refreshedEntry = refreshed.entries.find((entry) => entry.id === decision.queueEntryId);
  const barberName = refreshed.barbers.find((barber) => barber.userId === decision.barberId)?.displayName ?? null;
  if (sourceEntry) {
    await enqueueQueueStatusNotification(context.admin, {
      businessId: context.businessId,
      entryId: sourceEntry.id,
      clientId: sourceEntry.clientId,
      clientPhone: sourceEntry.clientPhone,
      smsConsent: sourceEntry.smsConsent,
      status: "assigned",
      barberName,
      estimatedWaitMinutes: refreshedEntry?.estimatedWaitMinutes ?? null,
    }).catch(() => null);
  }
  return { decision, duplicate: false };
}
