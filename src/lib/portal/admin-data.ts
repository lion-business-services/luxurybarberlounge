import "server-only";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { localizedName } from "./format";

export type AdminMetric = { label: string; value: string; source: "Supabase-derived" | "Square-derived" | "Calculated" | "Estimated"; note: string };
export type AdminPortalData = {
  configured: boolean;
  businessId: string | null;
  metrics: AdminMetric[];
  queue: Array<Record<string, unknown>>;
  clients: Array<{ id: string; name: string; email: string | null; phone: string | null; language: string; marketing: string; createdAt: string }>;
  orders: Array<{ id: string; squareId: string; state: string; totalCents: number | null; syncedAt: string }>;
  memberships: Array<{ id: string; status: string; renewsAt: string | null; plan: string; clientId: string; clientName: string }>;
  membershipPlans: Array<{ id: string; name: string; priceCents: number; billingInterval: string; squareCatalogId: string | null; active: boolean; status: string }>;
  membershipRequests: Array<{ id: string; clientUserId: string; clientName: string; requestType: string; requestedPlan: string | null; status: string; reason: string | null; reviewNote: string | null; createdAt: string }>;
  barbers: Array<{ id: string; slug: string; name: string; title: string; active: boolean; status: string }>;
  systems: Array<{ provider: string; status: string; detail: string }>;
  failures: Array<{ id: string; provider: string; resource: string; message: string; createdAt: string }>;
};

function countValue(result: { count?: number | null }) { return result.count ?? 0; }
function s(value: unknown) { return typeof value === "string" ? value : null; }
function canOperate(roles: readonly string[]) {
  return roles.some((role) => ["manager", "owner", "super_admin"].includes(role));
}

async function adminDataClient() {
  const session = await getServerAuthSession();
  if (!session.user || !canOperate(session.roles)) return null;
  const supabase = createUntypedAdminSupabase();
  return supabase ? { session, supabase } : null;
}

export async function loadAdminPortalData(): Promise<AdminPortalData> {
  const empty: AdminPortalData = { configured: false, businessId: null, metrics: [], queue: [], clients: [], orders: [], memberships: [], membershipPlans: [], membershipRequests: [], barbers: [], systems: [], failures: [] };
  const context = await adminDataClient();
  if (!context) return empty;
  const { supabase } = context;
  const { data: business } = await supabase.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const businessId = s((business as Record<string, unknown> | null)?.id);
  if (!businessId) return empty;

  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const [bookings, queueCount, clientCount, membershipCount, failedWebhooks, failedNotifications, queueRows, clientRows, orderRows, membershipRows, membershipPlanRows, membershipRequestRows, barberRows, integrations, syncFailures, payments] = await Promise.all([
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()),
    supabase.from("queue_entries").select("id", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"]),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "active"),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["trial", "active", "past_due", "paused"]),
    supabase.from("webhook_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).in("processing_status", ["failed", "dead_letter"]),
    supabase.from("notification_jobs").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "failed"),
    supabase.from("queue_entries").select("id,client_name,service_slug,status,estimated_wait_minutes,joined_at,public_token").eq("business_id", businessId).in("status", ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"]).order("manual_priority", { ascending: true }).order("joined_at", { ascending: true }).limit(20),
    supabase.from("clients").select("id,auth_user_id,first_name,last_name,email,phone,preferred_language,communication_preferences,status,created_at").eq("business_id", businessId).neq("status", "merged").order("created_at", { ascending: false }).limit(50),
    supabase.from("square_orders").select("id,square_id,state,total_cents,synced_at").eq("business_id", businessId).order("synced_at", { ascending: false }).limit(30),
    supabase.from("memberships").select("id,status,renews_at,client_user_id,membership_plans(name)").eq("business_id", businessId).order("created_at", { ascending: false }).limit(30),
    supabase.from("membership_plans").select("id,name,price_cents,billing_interval,square_catalog_id,active,status").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
    supabase.from("membership_requests").select("id,client_user_id,request_type,requested_plan_id,status,reason,review_note,created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
    supabase.from("barber_profiles").select("id,slug,display_name,professional_title,active,status").eq("business_id", businessId).order("sort_order", { ascending: true }).limit(50),
    supabase.from("integrations").select("provider,status,environment,last_success_at,last_error_at").eq("business_id", businessId).order("provider"),
    supabase.from("sync_failures").select("id,provider,resource_type,error_message,created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(10),
    supabase.from("square_payments").select("amount_cents,tip_cents,created_at_square").eq("business_id", businessId).gte("created_at_square", start.toISOString()).lt("created_at_square", end.toISOString()),
  ]);

  const paymentRows = (payments.data ?? []) as Array<Record<string, unknown>>;
  const revenue = paymentRows.reduce((sum, row) => sum + (typeof row.amount_cents === "number" ? row.amount_cents : 0), 0);
  const tips = paymentRows.reduce((sum, row) => sum + (typeof row.tip_cents === "number" ? row.tip_cents : 0), 0);
  const orderData = (orderRows.data ?? []) as Array<Record<string, unknown>>;
  const membershipData = (membershipRows.data ?? []) as Array<Record<string, unknown>>;
  const membershipPlanData = (membershipPlanRows.data ?? []) as Array<Record<string, unknown>>;
  const membershipRequestData = (membershipRequestRows.data ?? []) as Array<Record<string, unknown>>;
  const membershipClientIds = [...new Set([
    ...membershipData.map((row) => s(row.client_user_id)),
    ...membershipRequestData.map((row) => s(row.client_user_id)),
  ].filter((value): value is string => Boolean(value)))];
  const { data: membershipProfiles } = membershipClientIds.length
    ? await supabase.from("profiles").select("id,full_name,display_name").in("id", membershipClientIds)
    : { data: [] };
  const membershipClientNames = new Map(((membershipProfiles ?? []) as Array<Record<string, unknown>>).map((profile) => [String(profile.id), s(profile.display_name) ?? s(profile.full_name) ?? "Unnamed client"]));
  const membershipPlanNames = new Map(membershipPlanData.map((plan) => [String(plan.id), localizedName(plan.name, "Membership")]));

  return {
    configured: true,
    businessId,
    metrics: [
      { label: "Appointments today", value: String(countValue(bookings)), source: "Supabase-derived", note: "Confirmed booking records scheduled today" },
      { label: "Active queue", value: String(countValue(queueCount)), source: "Supabase-derived", note: "Waiting through in-service queue records" },
      { label: "Clients", value: String(countValue(clientCount)), source: "Supabase-derived", note: "Active client records" },
      { label: "Active memberships", value: String(countValue(membershipCount)), source: "Supabase-derived", note: "Trial, active, paused, or past due" },
      { label: "Service revenue today", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(revenue / 100), source: "Square-derived", note: "Synced payments only" },
      { label: "Tips today", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(tips / 100), source: "Square-derived", note: "Outside Commission Basis" },
      { label: "Failed webhooks", value: String(countValue(failedWebhooks)), source: "Supabase-derived", note: "Failed or dead-letter events" },
      { label: "Failed messages", value: String(countValue(failedNotifications)), source: "Supabase-derived", note: "Notification jobs requiring attention" },
    ],
    queue: ((queueRows.data ?? []) as Array<Record<string, unknown>>),
    clients: ((clientRows.data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const prefs = row.communication_preferences && typeof row.communication_preferences === "object" ? row.communication_preferences as Record<string, unknown> : {};
      const name = [s(row.first_name), s(row.last_name)].filter(Boolean).join(" ").trim();
      return {
        id: String(row.id),
        name: name || "Unnamed client",
        email: s(row.email),
        phone: s(row.phone),
        language: s(row.preferred_language) ?? "en",
        marketing: s(prefs.marketingStatus) ?? s(prefs.marketing_status) ?? "unknown",
        createdAt: String(row.created_at),
      };
    }),
    orders: orderData.map((row) => ({ id: String(row.id), squareId: String(row.square_id), state: s(row.state) ?? "unknown", totalCents: typeof row.total_cents === "number" ? row.total_cents : null, syncedAt: String(row.synced_at) })),
    memberships: membershipData.map((row) => {
      const joined = row.membership_plans;
      const plan = Array.isArray(joined) ? joined[0] as Record<string, unknown> | undefined : joined as Record<string, unknown> | undefined;
      const clientId = String(row.client_user_id);
      return { id: String(row.id), status: s(row.status) ?? "pending", renewsAt: s(row.renews_at), plan: localizedName(plan?.name, "Membership"), clientId, clientName: membershipClientNames.get(clientId) ?? "Unnamed client" };
    }),
    membershipPlans: membershipPlanData.map((row) => ({ id: String(row.id), name: localizedName(row.name, "Membership"), priceCents: typeof row.price_cents === "number" ? row.price_cents : 0, billingInterval: s(row.billing_interval) ?? "month", squareCatalogId: s(row.square_catalog_id), active: Boolean(row.active), status: s(row.status) ?? "draft" })),
    membershipRequests: membershipRequestData.map((row) => {
      const clientUserId = String(row.client_user_id);
      const requestedPlanId = s(row.requested_plan_id);
      return { id: String(row.id), clientUserId, clientName: membershipClientNames.get(clientUserId) ?? "Unnamed client", requestType: s(row.request_type) ?? "request", requestedPlan: requestedPlanId ? membershipPlanNames.get(requestedPlanId) ?? "Membership" : null, status: s(row.status) ?? "submitted", reason: s(row.reason), reviewNote: s(row.review_note), createdAt: String(row.created_at) };
    }),
    barbers: ((barberRows.data ?? []) as Array<Record<string, unknown>>).map((row) => ({ id: String(row.id), slug: String(row.slug), name: localizedName(row.display_name, "Barber"), title: localizedName(row.professional_title, "Independent Barber"), active: Boolean(row.active), status: s(row.status) ?? "draft" })),
    systems: ((integrations.data ?? []) as Array<Record<string, unknown>>).map((row) => ({ provider: s(row.provider) ?? "unknown", status: s(row.status) ?? "not_configured", detail: s(row.last_success_at) ? `Last success ${new Date(String(row.last_success_at)).toLocaleString()}` : s(row.last_error_at) ? "Recent error recorded" : `Environment: ${s(row.environment) ?? "unknown"}` })),
    failures: ((syncFailures.data ?? []) as Array<Record<string, unknown>>).map((row) => ({ id: String(row.id), provider: s(row.provider) ?? "unknown", resource: s(row.resource_type) ?? "resource", message: s(row.error_message) ?? "Sync failed", createdAt: String(row.created_at) })),
  };
}

export type AdminModuleRecord = {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  meta: string;
};

export type AdminModuleSnapshot = {
  configured: boolean;
  records: AdminModuleRecord[];
  totals: Array<{ label: string; value: string; source: string }>;
};

function record(id: unknown, primary: unknown, secondary: unknown, status: unknown, meta: unknown): AdminModuleRecord {
  return {
    id: String(id ?? ""),
    primary: String(primary ?? "Untitled"),
    secondary: String(secondary ?? ""),
    status: String(status ?? "unknown"),
    meta: String(meta ?? ""),
  };
}

export async function loadAdminModuleSnapshot(slug: string): Promise<AdminModuleSnapshot> {
  const context = await adminDataClient();
  if (!context) return { configured: false, records: [], totals: [] };
  const { supabase } = context;
  const { data: business } = await supabase.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const businessId = s((business as Record<string, unknown> | null)?.id);
  if (!businessId) return { configured: false, records: [], totals: [] };

  if (slug === "appointments" || slug === "today") {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + (slug === "today" ? 1 : 30));
    const { data } = await supabase.from("square_bookings").select("id,square_id,status,starts_at,duration_minutes,raw").eq("business_id", businessId).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()).order("starts_at").limit(100);
    const records = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const raw = row.raw && typeof row.raw === "object" ? row.raw as Record<string, unknown> : {};
      return record(row.id, raw.customer_name ?? raw.customer_id ?? `Booking ${String(row.square_id).slice(-8)}`, row.starts_at ? new Date(String(row.starts_at)).toLocaleString("en-US") : "Time pending", row.status, `${row.duration_minutes ?? "—"} minutes`);
    });
    return { configured: true, records, totals: [{ label: slug === "today" ? "Appointments today" : "Upcoming appointments", value: String(records.length), source: "Square-derived" }] };
  }

  if (slug === "services") {
    const { data } = await supabase.from("services").select("id,slug,name,price_cents,duration_minutes,content_status,active,square_catalog_id").eq("business_id", businessId).order("sort_order").limit(100);
    const records = ((data ?? []) as Array<Record<string, unknown>>).map((row) => record(row.id, localizedName(row.name, String(row.slug)), row.price_cents === null ? "Price pending" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(row.price_cents) / 100), row.active ? row.content_status : "inactive", row.square_catalog_id ? "Square mapped" : `${row.duration_minutes ?? "—"} minutes · mapping required`));
    return { configured: true, records, totals: [{ label: "Catalog services", value: String(records.length), source: "Supabase-derived" }] };
  }

  if (slug === "packages") {
    const { data } = await supabase.from("packages").select("id,name,status,price_cents,visits,per_visit_value_cents").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);
    const records = ((data ?? []) as Array<Record<string, unknown>>).map((row) => record(row.id, localizedName(row.name, "Package"), new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(row.price_cents ?? 0) / 100), row.status, `${row.visits ?? "—"} visits · per-visit value ${row.per_visit_value_cents === null ? "pending" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(row.per_visit_value_cents) / 100)}`));
    return { configured: true, records, totals: [{ label: "Packages", value: String(records.length), source: "Supabase-derived" }] };
  }

  if (slug === "automations") {
    const { data } = await supabase.from("automation_rules").select("id,name,trigger_key,channels,active,test_mode,version").eq("business_id", businessId).order("updated_at", { ascending: false }).limit(100);
    const records = ((data ?? []) as Array<Record<string, unknown>>).map((row) => record(row.id, row.name, row.trigger_key, row.active ? "active" : row.test_mode ? "test mode" : "inactive", `${Array.isArray(row.channels) ? row.channels.join(", ") : "No channels"} · v${row.version ?? 1}`));
    return { configured: true, records, totals: [{ label: "Automation rules", value: String(records.length), source: "Supabase-derived" }, { label: "Active", value: String(records.filter((item) => item.status === "active").length), source: "Supabase-derived" }] };
  }

  if (slug === "campaigns") {
    const { data } = await supabase.from("campaigns").select("id,name,objective,status,channels,created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);
    const records = ((data ?? []) as Array<Record<string, unknown>>).map((row) => record(row.id, row.name, row.objective, row.status, Array.isArray(row.channels) ? row.channels.join(", ") : "No channels"));
    return { configured: true, records, totals: [{ label: "Campaigns", value: String(records.length), source: "Supabase-derived" }] };
  }

  if (slug === "notifications") {
    const { data } = await supabase.from("notification_jobs").select("id,channel,template_key,status,recipient,scheduled_for,attempt_count,last_error").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);
    const records = ((data ?? []) as Array<Record<string, unknown>>).map((row) => record(row.id, row.template_key ?? "Notification", `${row.channel ?? "channel"} · ${row.recipient ? "recipient recorded" : "recipient pending"}`, row.status, row.last_error ?? `${row.attempt_count ?? 0} attempts · ${row.scheduled_for ? new Date(String(row.scheduled_for)).toLocaleString("en-US") : "unscheduled"}`));
    return { configured: true, records, totals: [{ label: "Recent jobs", value: String(records.length), source: "Supabase-derived" }, { label: "Failed", value: String(records.filter((item) => item.status === "failed").length), source: "Supabase-derived" }] };
  }

  if (slug === "content") {
    const { data } = await supabase.from("pages").select("id,slug,title,status,published_at,updated_at").eq("business_id", businessId).order("updated_at", { ascending: false }).limit(100);
    const records = ((data ?? []) as Array<Record<string, unknown>>).map((row) => record(row.id, localizedName(row.title, String(row.slug)), String(row.slug), row.status, row.published_at ? `Published ${new Date(String(row.published_at)).toLocaleDateString("en-US")}` : "Not published"));
    return { configured: true, records, totals: [{ label: "Managed pages", value: String(records.length), source: "Supabase-derived" }] };
  }

  if (slug === "reviews") {
    const { data } = await supabase.from("reviews").select("id,author_display_name,rating,status,source,published_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);
    const records = ((data ?? []) as Array<Record<string, unknown>>).map((row) => record(row.id, row.author_display_name ?? "Anonymous", `${row.rating ?? "—"}/5 · ${row.source ?? "source"}`, row.status, row.published_at ? `Published ${new Date(String(row.published_at)).toLocaleDateString("en-US")}` : "Awaiting publication"));
    return { configured: true, records, totals: [{ label: "Reviews", value: String(records.length), source: "Supabase-derived" }] };
  }

  if (slug === "audit" || slug === "security") {
    const { data } = await supabase.from("audit_logs").select("id,actor_role,action,resource_type,resource_id,reason,created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);
    const records = ((data ?? []) as Array<Record<string, unknown>>).map((row) => record(row.id, row.action, `${row.resource_type ?? "resource"}${row.resource_id ? ` · ${row.resource_id}` : ""}`, row.actor_role ?? "system", row.reason ?? new Date(String(row.created_at)).toLocaleString("en-US")));
    return { configured: true, records, totals: [{ label: "Recent audited actions", value: String(records.length), source: "Supabase-derived" }] };
  }

  if (slug === "settings") {
    const [featureResult, settingResult] = await Promise.all([
      supabase.from("feature_flags").select("id,key,enabled,description,updated_at").eq("business_id", businessId).order("key"),
      supabase.from("system_settings").select("id,key,sensitivity,updated_at").eq("business_id", businessId).order("key"),
    ]);
    const records = [
      ...((featureResult.data ?? []) as Array<Record<string, unknown>>).map((row) => record(row.id, row.key, row.description, row.enabled ? "enabled" : "disabled", row.updated_at ? new Date(String(row.updated_at)).toLocaleString("en-US") : "")),
      ...((settingResult.data ?? []) as Array<Record<string, unknown>>).map((row) => record(row.id, row.key, "System setting", row.sensitivity, row.updated_at ? new Date(String(row.updated_at)).toLocaleString("en-US") : "")),
    ];
    return { configured: true, records, totals: [{ label: "Configuration records", value: String(records.length), source: "Supabase-derived" }] };
  }

  return { configured: true, records: [], totals: [] };
}

export type AdminClientDetailData = {
  configured: boolean;
  id: string;
  authUserId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  language: string;
  status: string;
  marketing: string;
  favoriteBarberId: string | null;
  groomingPreferences: Record<string, unknown>;
  tags: string[];
  notes: Array<{ id: string; note: string; visibility: string; createdAt: string }>;
  totals: { appointments: number; queueVisits: number; orders: number; memberships: number; consents: number; supportCases: number };
};

export async function loadAdminClientDetail(id: string): Promise<AdminClientDetailData | null> {
  const context = await adminDataClient();
  if (!context) return null;
  const { supabase } = context;
  const { data: business } = await supabase.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const businessId = s((business as Record<string, unknown> | null)?.id);
  if (!businessId) return null;
  const { data: client } = await supabase.from("clients").select("id,auth_user_id,square_customer_id,first_name,last_name,email,phone,preferred_language,preferred_barber_profile_id,grooming_preferences,communication_preferences,status").eq("business_id", businessId).eq("id", id).maybeSingle();
  if (!client) return null;
  const row = client as Record<string, unknown>;
  const authUserId = s(row.auth_user_id);
  const customerId = s(row.square_customer_id);
  let legacy: Record<string, unknown> | null = null;
  if (authUserId) {
    const { data } = await supabase.from("client_profiles").select("marketing_status,grooming_preferences").eq("business_id", businessId).eq("user_id", authUserId).maybeSingle();
    legacy = data as Record<string, unknown> | null;
  }
  const preferences = row.communication_preferences && typeof row.communication_preferences === "object" ? row.communication_preferences as Record<string, unknown> : {};
  const name = [s(row.first_name), s(row.last_name)].filter(Boolean).join(" ").trim() || "Unnamed client";
  const [appointments, queueVisits, orders, memberships, consents, supportCases, tags, notes] = await Promise.all([
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("client_id", id),
    authUserId ? supabase.from("queue_entries").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("client_id", authUserId) : Promise.resolve({ count: 0 }),
    customerId ? supabase.from("square_orders").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("customer_square_id", customerId) : Promise.resolve({ count: 0 }),
    authUserId ? supabase.from("memberships").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("client_user_id", authUserId) : Promise.resolve({ count: 0 }),
    authUserId ? supabase.from("consent_records").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("user_id", authUserId) : Promise.resolve({ count: 0 }),
    authUserId ? supabase.from("support_cases").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("client_user_id", authUserId) : Promise.resolve({ count: 0 }),
    authUserId ? supabase.from("client_tags").select("tag").eq("business_id", businessId).eq("client_user_id", authUserId).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    authUserId ? supabase.from("client_notes").select("id,note,visibility,created_at").eq("business_id", businessId).eq("client_user_id", authUserId).order("created_at", { ascending: false }).limit(25) : Promise.resolve({ data: [] }),
  ]);
  const grooming = row.grooming_preferences && typeof row.grooming_preferences === "object" ? row.grooming_preferences as Record<string, unknown> : legacy?.grooming_preferences && typeof legacy.grooming_preferences === "object" ? legacy.grooming_preferences as Record<string, unknown> : {};
  return {
    configured: true,
    id,
    authUserId,
    name,
    email: s(row.email),
    phone: s(row.phone),
    language: s(row.preferred_language) ?? "en",
    status: s(row.status) ?? "active",
    marketing: s(preferences.marketingStatus) ?? s(preferences.marketing_status) ?? s(legacy?.marketing_status) ?? "unknown",
    favoriteBarberId: s(row.preferred_barber_profile_id),
    groomingPreferences: grooming,
    tags: ((tags.data ?? []) as Array<Record<string, unknown>>).map((item) => String(item.tag)),
    notes: ((notes.data ?? []) as Array<Record<string, unknown>>).map((item) => ({ id: String(item.id), note: String(item.note), visibility: String(item.visibility), createdAt: String(item.created_at) })),
    totals: { appointments: appointments.count ?? 0, queueVisits: queueVisits.count ?? 0, orders: orders.count ?? 0, memberships: memberships.count ?? 0, consents: consents.count ?? 0, supportCases: supportCases.count ?? 0 },
  };
}

export async function loadAdminBarberDetail(id: string) {
  const context = await adminDataClient();
  if (!context) return null;
  const { supabase } = context;
  const { data: business } = await supabase.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const businessId = s((business as Record<string, unknown> | null)?.id);
  if (!businessId) return null;
  const { data } = await supabase.from("barber_profiles").select("id,staff_user_id,slug,display_name,professional_title,short_intro,biography,specialties,languages,square_team_member_id,portal_email,active,status,featured,accepting_walk_ins,availability_status").eq("business_id", businessId).eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const staffUserId = s(row.staff_user_id);
  const [appointments, queueAssignments, statements, disputes, serviceRows, staffServiceRows, scheduleRows] = await Promise.all([
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("barber_profile_id", id),
    staffUserId ? supabase.from("queue_assignments").select("id", { count: "exact", head: true }).eq("barber_user_id", staffUserId) : Promise.resolve({ count: 0 }),
    staffUserId ? supabase.from("settlement_statements").select("id", { count: "exact", head: true }).eq("barber_user_id", staffUserId) : Promise.resolve({ count: 0 }),
    staffUserId ? supabase.from("commission_disputes").select("id", { count: "exact", head: true }).eq("barber_user_id", staffUserId) : Promise.resolve({ count: 0 }),
    supabase.from("services").select("id,slug,name,active").eq("business_id", businessId).eq("active", true).order("sort_order", { ascending: true }),
    staffUserId ? supabase.from("staff_services").select("service_id,active").eq("staff_user_id", staffUserId).eq("active", true) : Promise.resolve({ data: [] }),
    supabase.from("barber_schedules").select("id,weekday,starts_at,ends_at,effective_from,effective_to,active").eq("barber_profile_id", id).eq("active", true).order("weekday", { ascending: true }).order("effective_from", { ascending: false }),
  ]);
  const availableServices = ((serviceRows.data ?? []) as Array<Record<string, unknown>>).map((service) => ({
    id: String(service.id),
    slug: String(service.slug),
    name: localizedName(service.name, String(service.slug)),
  }));
  const serviceIds = ((staffServiceRows.data ?? []) as Array<Record<string, unknown>>).map((service) => String(service.service_id));
  return {
    id: String(row.id), staffUserId, slug: String(row.slug), name: localizedName(row.display_name, "Barber"), title: localizedName(row.professional_title, "Independent Barber"), intro: localizedName(row.short_intro, ""), biography: localizedName(row.biography, ""), specialties: Array.isArray(row.specialties) ? row.specialties.map(String) : [], languages: Array.isArray(row.languages) ? row.languages.map(String) : [], squareTeamMemberId: s(row.square_team_member_id), portalEmail: s(row.portal_email), active: Boolean(row.active), status: s(row.status) ?? "draft", featured: Boolean(row.featured), acceptingWalkIns: row.accepting_walk_ins !== false, availabilityStatus: s(row.availability_status) ?? "available", serviceIds, availableServices, schedules: ((scheduleRows.data ?? []) as Array<Record<string, unknown>>).map((schedule) => ({ id: String(schedule.id), weekday: Number(schedule.weekday), start: s(schedule.starts_at) ?? "09:00", end: s(schedule.ends_at) ?? "17:00", effectiveFrom: s(schedule.effective_from) ?? "", effectiveTo: s(schedule.effective_to) })), totals: { appointments: appointments.count ?? 0, queueAssignments: queueAssignments.count ?? 0, statements: statements.count ?? 0, disputes: disputes.count ?? 0 },
  };
}

export type AdminAutomationRule = {
  id: string;
  name: string;
  key: string;
  triggerKey: string;
  channels: string[];
  delaySeconds: number;
  active: boolean;
  testMode: boolean;
  version: number;
};

export async function loadAdminAutomationRules(): Promise<AdminAutomationRule[]> {
  const context = await adminDataClient();
  if (!context) return [];
  const { supabase } = context;
  const { data: business } = await supabase.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const businessId = s((business as Record<string, unknown> | null)?.id);
  if (!businessId) return [];
  const { data } = await supabase.from("automation_rules").select("id,name,key,trigger_key,channels,delay_seconds,active,test_mode,version").eq("business_id", businessId).order("updated_at", { ascending: false }).limit(100);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id), name: String(row.name), key: String(row.key), triggerKey: String(row.trigger_key), channels: Array.isArray(row.channels) ? row.channels.map(String) : [], delaySeconds: typeof row.delay_seconds === "number" ? row.delay_seconds : 0, active: Boolean(row.active), testMode: Boolean(row.test_mode), version: typeof row.version === "number" ? row.version : 1,
  }));
}
