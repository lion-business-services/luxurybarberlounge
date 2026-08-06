import "server-only";
import { createUserServerSupabase, getServerAuthSession } from "@/lib/auth/server";
import { jsonRecord, localizedName } from "./format";

export type ClientAppointment = {
  id: string;
  squareBookingId: string | null;
  startsAt: string | null;
  status: string;
  service: string;
  barber: string;
  durationMinutes: number | null;
  depositStatus: string | null;
  location: string;
  referenceCode: string | null;
  priceCents: number | null;
};

export type ClientQueueEntry = {
  id: string;
  status: string;
  estimatedWaitMinutes: number | null;
  service: string;
  barberPreference: string | null;
  joinedAt: string;
  publicToken: string;
};

export type ClientMembership = {
  id: string;
  status: string;
  planName: string;
  renewsAt: string | null;
  benefits: string[];
};

export type ClientOrder = {
  id: string;
  squareId: string;
  state: string;
  totalCents: number | null;
  taxCents: number | null;
  discountCents: number | null;
  syncedAt: string;
  receiptUrl: string | null;
  receiptNumber: string | null;
};

export type ClientPortalData = {
  configured: boolean;
  generatedAt: string;
  profile: {
    fullName: string | null;
    displayName: string | null;
    phone: string | null;
    email: string | null;
    language: string;
    status: string;
  };
  clientProfile: {
    favoriteBarberId: string | null;
    marketingStatus: string;
    groomingPreferences: Record<string, unknown>;
  } | null;
  appointments: ClientAppointment[];
  queue: ClientQueueEntry | null;
  membership: ClientMembership | null;
  orders: ClientOrder[];
  notifications: Array<{ id: string; status: string; channel: string; template: string | null; createdAt: string }>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function loadClientPortalData(): Promise<ClientPortalData> {
  const session = await getServerAuthSession();
  const empty: ClientPortalData = {
    configured: false,
    generatedAt: new Date().toISOString(),
    profile: { fullName: null, displayName: null, phone: null, email: session.user?.email ?? null, language: "en", status: "active" },
    clientProfile: null,
    appointments: [],
    queue: null,
    membership: null,
    orders: [],
    notifications: [],
  };
  if (!session.user || !session.accessToken) return empty;
  const supabase = createUserServerSupabase(session.accessToken);
  if (!supabase) return empty;

  const [profileResult, clientResult, bookingResult, queueResult, membershipResult, notificationResult, appointmentResult] = await Promise.all([
    supabase.from("profiles").select("id,full_name,display_name,phone,preferred_language,status").eq("id", session.user.id).maybeSingle(),
    supabase.from("client_profiles").select("user_id,favorite_barber_id,square_customer_id,marketing_status,grooming_preferences").eq("user_id", session.user.id).maybeSingle(),
    supabase.from("booking_metadata").select("id,square_booking_id,barber_user_id,location_id,service_snapshot,deposit_status,reference_code,metadata,created_at").eq("client_user_id", session.user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("queue_entries").select("id,status,estimated_wait_minutes,service_slug,barber_preference,joined_at,public_token").eq("client_id", session.user.id).in("status", ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"]).order("joined_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("memberships").select("id,status,renews_at,plan_id,membership_plans(name,benefits)").eq("client_user_id", session.user.id).in("status", ["pending", "trial", "active", "paused", "past_due", "cancel_requested"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("notification_jobs").select("id,status,channel,template_key,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("appointments").select("id,square_booking_id,starts_at,ends_at,status,service_name_snapshot,barber_name_snapshot,service_duration_snapshot_minutes,deposit_status,public_reference,service_price_snapshot_cents,location_id,locations(name)").order("starts_at", { ascending: false }).limit(50),
  ]);

  const clientRow = clientResult.data as Record<string, unknown> | null;
  const squareCustomerId = stringValue(clientRow?.square_customer_id);
  const orderResult = squareCustomerId
    ? await supabase.from("square_orders").select("id,square_id,state,total_cents,tax_cents,discount_cents,synced_at").eq("customer_square_id", squareCustomerId).order("synced_at", { ascending: false }).limit(20)
    : { data: [] as unknown[], error: null };

  const orderRows = (orderResult.data ?? []) as Array<Record<string, unknown>>;
  const orderIds = orderRows.map((row) => String(row.id));
  const receiptRows = orderIds.length
    ? ((await supabase.from("receipts_metadata").select("square_order_id,receipt_url,receipt_number").eq("client_user_id", session.user.id).in("square_order_id", orderIds)).data ?? []) as Array<Record<string, unknown>>
    : [];
  const receiptMap = new Map(receiptRows.map((row) => [String(row.square_order_id), row]));

  const bookingRows = (bookingResult.data ?? []) as Array<Record<string, unknown>>;
  const squareIds = bookingRows.map((row) => stringValue(row.square_booking_id)).filter((value): value is string => Boolean(value));
  const squareRows = squareIds.length
    ? ((await supabase.from("square_bookings").select("square_id,status,starts_at,duration_minutes,raw").in("square_id", squareIds)).data ?? []) as Array<Record<string, unknown>>
    : [];
  const squareMap = new Map(squareRows.map((row) => [String(row.square_id), row]));

  const legacyAppointments: ClientAppointment[] = bookingRows.map((row) => {
    const squareId = stringValue(row.square_booking_id);
    const square = squareId ? squareMap.get(squareId) : undefined;
    const snapshot = jsonRecord(row.service_snapshot);
    const metadata = jsonRecord(row.metadata);
    const squareRaw = jsonRecord(square?.raw);
    return {
      id: String(row.id),
      squareBookingId: squareId,
      startsAt: stringValue(square?.starts_at) ?? stringValue(metadata.starts_at) ?? stringValue(metadata.startsAt),
      status: stringValue(square?.status) ?? stringValue(metadata.status) ?? "pending",
      service: localizedName(snapshot, stringValue(metadata.service_name) ?? "Service details pending"),
      barber: stringValue(metadata.barber_name) ?? stringValue(squareRaw.barber_name) ?? "Barber to be confirmed",
      durationMinutes: typeof square?.duration_minutes === "number" ? square.duration_minutes : typeof metadata.duration_minutes === "number" ? metadata.duration_minutes : null,
      depositStatus: stringValue(row.deposit_status),
      location: stringValue(metadata.location_name) ?? "Luxury Barber Lounge",
      referenceCode: stringValue(row.reference_code),
      priceCents: typeof snapshot.price_cents === "number" ? snapshot.price_cents : typeof metadata.price_cents === "number" ? metadata.price_cents : null,
    };
  });
  const newAppointments: ClientAppointment[] = ((appointmentResult.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const joinedLocation = row.locations;
    const location = (Array.isArray(joinedLocation) ? joinedLocation[0] : joinedLocation) as Record<string, unknown> | undefined;
    return {
      id: String(row.id),
      squareBookingId: stringValue(row.square_booking_id),
      startsAt: stringValue(row.starts_at),
      status: stringValue(row.status) ?? "confirmed",
      service: stringValue(row.service_name_snapshot) ?? "Service",
      barber: stringValue(row.barber_name_snapshot) ?? "Barber",
      durationMinutes: typeof row.service_duration_snapshot_minutes === "number" ? row.service_duration_snapshot_minutes : null,
      depositStatus: stringValue(row.deposit_status),
      location: localizedName(location?.name, "Luxury Barber Lounge"),
      referenceCode: stringValue(row.public_reference),
      priceCents: typeof row.service_price_snapshot_cents === "number" ? row.service_price_snapshot_cents : null,
    };
  });
  const appointmentIds = new Set(newAppointments.map((item) => item.squareBookingId).filter(Boolean));
  const appointments = [...newAppointments, ...legacyAppointments.filter((item) => !item.squareBookingId || !appointmentIds.has(item.squareBookingId))].sort((a, b) => {
    const left = a.startsAt ? new Date(a.startsAt).getTime() : 0;
    const right = b.startsAt ? new Date(b.startsAt).getTime() : 0;
    return right - left;
  });

  const membershipRow = membershipResult.data as Record<string, unknown> | null;
  const joinedPlan = membershipRow?.membership_plans;
  const plan = Array.isArray(joinedPlan) ? joinedPlan[0] as Record<string, unknown> | undefined : joinedPlan as Record<string, unknown> | undefined;
  const benefitsRaw = plan?.benefits;
  const benefits = Array.isArray(benefitsRaw) ? benefitsRaw.filter((item): item is string => typeof item === "string") : [];
  const queueRow = queueResult.data as Record<string, unknown> | null;
  const profileRow = profileResult.data as Record<string, unknown> | null;

  return {
    configured: true,
    generatedAt: new Date().toISOString(),
    profile: {
      fullName: stringValue(profileRow?.full_name),
      displayName: stringValue(profileRow?.display_name),
      phone: stringValue(profileRow?.phone),
      email: session.user.email ?? null,
      language: stringValue(profileRow?.preferred_language) ?? "en",
      status: stringValue(profileRow?.status) ?? "active",
    },
    clientProfile: clientRow ? {
      favoriteBarberId: stringValue(clientRow.favorite_barber_id),
      marketingStatus: stringValue(clientRow.marketing_status) ?? "unknown",
      groomingPreferences: jsonRecord(clientRow.grooming_preferences),
    } : null,
    appointments,
    queue: queueRow ? {
      id: String(queueRow.id),
      status: stringValue(queueRow.status) ?? "waiting",
      estimatedWaitMinutes: typeof queueRow.estimated_wait_minutes === "number" ? queueRow.estimated_wait_minutes : null,
      service: stringValue(queueRow.service_slug)?.replaceAll("-", " ") ?? "Service pending",
      barberPreference: stringValue(queueRow.barber_preference),
      joinedAt: String(queueRow.joined_at),
      publicToken: String(queueRow.public_token),
    } : null,
    membership: membershipRow ? {
      id: String(membershipRow.id),
      status: stringValue(membershipRow.status) ?? "pending",
      planName: localizedName(plan?.name, "Membership plan"),
      renewsAt: stringValue(membershipRow.renews_at),
      benefits,
    } : null,
    orders: orderRows.map((row) => {
      const receipt = receiptMap.get(String(row.id));
      return {
        id: String(row.id),
        squareId: String(row.square_id),
        state: stringValue(row.state) ?? "unknown",
        totalCents: typeof row.total_cents === "number" ? row.total_cents : null,
        taxCents: typeof row.tax_cents === "number" ? row.tax_cents : null,
        discountCents: typeof row.discount_cents === "number" ? row.discount_cents : null,
        syncedAt: String(row.synced_at),
        receiptUrl: stringValue(receipt?.receipt_url),
        receiptNumber: stringValue(receipt?.receipt_number),
      };
    }),
    notifications: ((notificationResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      status: stringValue(row.status) ?? "queued",
      channel: stringValue(row.channel) ?? "email",
      template: stringValue(row.template_key),
      createdAt: String(row.created_at),
    })),
  };
}
