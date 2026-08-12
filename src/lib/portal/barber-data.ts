import "server-only";

import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { barbers as publicBarbers } from "@/lib/content/site";
import { localizedName } from "./format";

const activeQueueStatuses = ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"];

export type BarberPortalAppointment = {
  id: string;
  reference: string;
  startsAt: string;
  endsAt: string;
  status: string;
  clientId: string;
  clientName: string;
  service: string;
  serviceValueCents: number;
  depositStatus: string;
};

export type BarberPortalData = {
  configured: boolean;
  generatedAt: string;
  barber: {
    userId: string | null;
    profileId: string | null;
    slug: string | null;
    name: string;
    title: string;
    email: string | null;
    portrait: string | null;
    socialUrl: string | null;
    socialHandle: string | null;
    acceptingWalkIns: boolean;
    availabilityStatus: string;
  };
  appointments: BarberPortalAppointment[];
  schedule: Array<{ weekday: number; start: string; end: string; effectiveFrom: string; effectiveTo: string | null }>;
  clients: Array<{ id: string; name: string; phone: string | null; email: string | null; lastVisit: string; appointments: number; serviceValueCents: number }>;
  queue: Array<{ id: string; token: string; client: string; service: string; status: string; waitMinutes: number | null; joinedAt: string }>;
  notifications: Array<{ id: string; channel: string; template: string; status: string; createdAt: string }>;
  commission: {
    currentAmountCents: number;
    currentBasisCents: number;
    tipsCents: number;
    statements: number;
    openDisputes: number;
    latestStatus: string | null;
    latestPeriod: string | null;
  };
  performance: {
    appointmentCount: number;
    completedCount: number;
    uniqueClients: number;
    scheduledServiceValueCents: number;
    calculatedCommissionCents: number;
  };
};

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function emptyData(email: string | null = null): BarberPortalData {
  return {
    configured: false,
    generatedAt: new Date().toISOString(),
    barber: {
      userId: null,
      profileId: null,
      slug: null,
      name: email === "support@lbsprocess.com" ? "Barber Portal Test" : "Barber",
      title: "Independent Barber",
      email,
      portrait: null,
      socialUrl: null,
      socialHandle: null,
      acceptingWalkIns: false,
      availabilityStatus: "unavailable",
    },
    appointments: [],
    schedule: [],
    clients: [],
    queue: [],
    notifications: [],
    commission: { currentAmountCents: 0, currentBasisCents: 0, tipsCents: 0, statements: 0, openDisputes: 0, latestStatus: null, latestPeriod: null },
    performance: { appointmentCount: 0, completedCount: 0, uniqueClients: 0, scheduledServiceValueCents: 0, calculatedCommissionCents: 0 },
  };
}

export async function loadBarberPortalData(): Promise<BarberPortalData> {
  const session = await getServerAuthSession();
  const email = session.user?.email?.trim().toLowerCase() ?? null;
  const empty = emptyData(email);
  if (!session.user || !session.roles.some((role) => ["barber", "owner", "super_admin"].includes(role))) return empty;
  const admin = createUntypedAdminSupabase();
  if (!admin) return empty;

  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) return empty;
  const businessId = String(business.id);
  const [{ data: staff }, { data: profile }] = await Promise.all([
    admin.from("staff_profiles").select("user_id,professional_title,location_id,active").eq("business_id", businessId).eq("user_id", session.user.id).maybeSingle(),
    admin.from("barber_profiles").select("id,slug,display_name,professional_title,staff_user_id,accepting_walk_ins,availability_status,active,status").eq("business_id", businessId).eq("staff_user_id", session.user.id).maybeSingle(),
  ]);

  const profileId = profile?.id ? String(profile.id) : null;
  const slug = text(profile?.slug);
  const publicProfile = slug ? publicBarbers.find((item) => item.slug === slug) : null;
  const barberName = profile ? localizedName(profile.display_name, publicProfile?.name ?? "Barber") : email === "support@lbsprocess.com" ? "Barber Portal Test" : "Barber";
  const title = profile ? localizedName(profile.professional_title, text(staff?.professional_title) ?? "Independent Barber") : text(staff?.professional_title) ?? "Independent Barber";

  const appointmentQuery = admin
    .from("appointments")
    .select("id,public_reference,client_id,client_name_snapshot,service_name_snapshot,service_price_snapshot_cents,starts_at,ends_at,status,deposit_status")
    .eq("business_id", businessId)
    .order("starts_at", { ascending: false })
    .limit(250);
  const appointmentsResult = profileId
    ? await appointmentQuery.eq("barber_profile_id", profileId)
    : await appointmentQuery.eq("assigned_staff_user_id", session.user.id);

  const appointments: BarberPortalAppointment[] = (appointmentsResult.data ?? []).map((row) => ({
    id: String(row.id),
    reference: String(row.public_reference),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    status: String(row.status),
    clientId: String(row.client_id),
    clientName: String(row.client_name_snapshot ?? "Client"),
    service: String(row.service_name_snapshot ?? "Service"),
    serviceValueCents: number(row.service_price_snapshot_cents),
    depositStatus: String(row.deposit_status ?? "not_required"),
  }));

  let scheduleRows: Array<Record<string, unknown>> = [];
  if (profileId) {
    const result = await admin.from("barber_schedules").select("weekday,starts_at,ends_at,effective_from,effective_to,active").eq("barber_profile_id", profileId).eq("active", true).order("weekday");
    scheduleRows = (result.data ?? []) as Array<Record<string, unknown>>;
  } else {
    const result = await admin.from("barber_schedules").select("weekday,starts_at,ends_at,effective_from,effective_to,active").eq("barber_user_id", session.user.id).eq("active", true).order("weekday");
    scheduleRows = (result.data ?? []) as Array<Record<string, unknown>>;
  }

  const clientIds = [...new Set(appointments.map((item) => item.clientId))];
  const clientResult = clientIds.length
    ? await admin.from("clients").select("id,first_name,last_name,email,phone").eq("business_id", businessId).in("id", clientIds)
    : { data: [] as Array<Record<string, unknown>> };
  const clientById = new Map(((clientResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), row]));
  const groupedClients = new Map<string, { appointments: BarberPortalAppointment[] }>();
  for (const appointment of appointments) {
    const group = groupedClients.get(appointment.clientId) ?? { appointments: [] };
    group.appointments.push(appointment);
    groupedClients.set(appointment.clientId, group);
  }
  const clients = [...groupedClients.entries()].map(([id, group]) => {
    const row = clientById.get(id);
    const first = text(row?.first_name) ?? "";
    const last = text(row?.last_name) ?? "";
    const fallback = group.appointments[0]?.clientName ?? "Client";
    return {
      id,
      name: `${first} ${last}`.trim() || fallback,
      phone: text(row?.phone),
      email: text(row?.email),
      lastVisit: group.appointments[0]?.startsAt ?? "",
      appointments: group.appointments.length,
      serviceValueCents: group.appointments.reduce((sum, item) => sum + item.serviceValueCents, 0),
    };
  });

  const { data: assignmentRows } = await admin.from("queue_assignments").select("queue_entry_id").eq("barber_user_id", session.user.id).eq("active", true);
  const queueIds = (assignmentRows ?? []).map((row) => String(row.queue_entry_id));
  const queueResult = queueIds.length
    ? await admin.from("queue_entries").select("id,public_token,client_name,service_slug,status,estimated_wait_minutes,joined_at").in("id", queueIds).in("status", activeQueueStatuses).order("joined_at")
    : { data: [] as Array<Record<string, unknown>> };

  const [statementResult, disputeResult, calculationResult, notificationResult] = await Promise.all([
    admin.from("settlement_statements").select("id,settlement_period_id,final_amount_cents,gross_basis_cents,tips_cents,status,created_at,settlement_periods(label)").eq("barber_user_id", session.user.id).order("created_at", { ascending: false }).limit(30),
    admin.from("commission_disputes").select("id,status").eq("barber_user_id", session.user.id).not("status", "in", "(denied,approved,closed,withdrawn)"),
    admin.from("commission_calculations").select("barber_amount_cents,eligible_basis_cents,tip_cents,status").eq("barber_user_id", session.user.id).neq("status", "voided").order("calculated_at", { ascending: false }).limit(500),
    admin.from("notification_jobs").select("id,channel,template_key,status,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  const statements = (statementResult.data ?? []) as Array<Record<string, unknown>>;
  const calculations = (calculationResult.data ?? []) as Array<Record<string, unknown>>;
  const latest = statements[0];
  const periodJoin = latest?.settlement_periods;
  const period = (Array.isArray(periodJoin) ? periodJoin[0] : periodJoin) as Record<string, unknown> | undefined;


  return {
    configured: true,
    generatedAt: new Date().toISOString(),
    barber: {
      userId: session.user.id,
      profileId,
      slug,
      name: barberName,
      title,
      email,
      portrait: publicProfile?.image.profile ?? null,
      socialUrl: publicProfile?.socialUrl ?? null,
      socialHandle: publicProfile?.instagramHandle ?? null,
      acceptingWalkIns: profile?.accepting_walk_ins !== false,
      availabilityStatus: text(profile?.availability_status) ?? "available",
    },
    appointments,
    schedule: scheduleRows.map((row) => ({
      weekday: number(row.weekday),
      start: text(row.starts_at) ?? "",
      end: text(row.ends_at) ?? "",
      effectiveFrom: text(row.effective_from) ?? "",
      effectiveTo: text(row.effective_to),
    })),
    clients,
    queue: ((queueResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      token: String(row.public_token ?? "").slice(-4).toUpperCase(),
      client: text(row.client_name) ?? `Guest ${String(row.public_token ?? "").slice(-4).toUpperCase()}`,
      service: text(row.service_slug)?.replaceAll("-", " ") ?? "Service",
      status: text(row.status) ?? "waiting",
      waitMinutes: typeof row.estimated_wait_minutes === "number" ? row.estimated_wait_minutes : null,
      joinedAt: String(row.joined_at),
    })),
    notifications: ((notificationResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      channel: text(row.channel) ?? "notification",
      template: text(row.template_key) ?? "account update",
      status: text(row.status) ?? "queued",
      createdAt: String(row.created_at),
    })),
    commission: {
      currentAmountCents: number(latest?.final_amount_cents),
      currentBasisCents: number(latest?.gross_basis_cents),
      tipsCents: number(latest?.tips_cents),
      statements: statements.length,
      openDisputes: (disputeResult.data ?? []).length,
      latestStatus: text(latest?.status),
      latestPeriod: text(period?.label),
    },
    performance: {
      appointmentCount: appointments.length,
      completedCount: appointments.filter((item) => item.status === "completed").length,
      uniqueClients: clients.length,
      scheduledServiceValueCents: appointments.reduce((sum, item) => sum + item.serviceValueCents, 0),
      calculatedCommissionCents: calculations.reduce((sum, row) => sum + number(row.barber_amount_cents), 0),
    },
  };
}
