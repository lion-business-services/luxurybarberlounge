import "server-only";
import { createUserServerSupabase, getServerAuthSession } from "@/lib/auth/server";
import { localizedName } from "./format";

export type AdminMetric = { label: string; value: string; source: "Supabase-derived" | "Square-derived" | "Calculated" | "Estimated"; note: string };
export type AdminPortalData = {
  configured: boolean;
  businessId: string | null;
  metrics: AdminMetric[];
  queue: Array<Record<string, unknown>>;
  clients: Array<{ id: string; name: string; phone: string | null; language: string; marketing: string; createdAt: string }>;
  orders: Array<{ id: string; squareId: string; state: string; totalCents: number | null; syncedAt: string }>;
  memberships: Array<{ id: string; status: string; renewsAt: string | null; plan: string; clientId: string }>;
  barbers: Array<{ id: string; slug: string; name: string; title: string; active: boolean; status: string }>;
  systems: Array<{ provider: string; status: string; detail: string }>;
  failures: Array<{ id: string; provider: string; resource: string; message: string; createdAt: string }>;
};

function countValue(result: { count?: number | null }) { return result.count ?? 0; }
function s(value: unknown) { return typeof value === "string" ? value : null; }

export async function loadAdminPortalData(): Promise<AdminPortalData> {
  const session = await getServerAuthSession();
  const empty: AdminPortalData = { configured: false, businessId: null, metrics: [], queue: [], clients: [], orders: [], memberships: [], barbers: [], systems: [], failures: [] };
  if (!session.user || !session.accessToken) return empty;
  const supabase = createUserServerSupabase(session.accessToken);
  if (!supabase) return empty;
  const { data: business } = await supabase.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const businessId = s((business as Record<string, unknown> | null)?.id);
  if (!businessId) return empty;

  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const [bookings, queueCount, clientCount, membershipCount, failedWebhooks, failedNotifications, queueRows, clientRows, orderRows, membershipRows, barberRows, integrations, syncFailures, payments] = await Promise.all([
    supabase.from("square_bookings").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()),
    supabase.from("queue_entries").select("id", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"]),
    supabase.from("client_profiles").select("user_id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["trial", "active", "past_due", "paused"]),
    supabase.from("webhook_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).in("processing_status", ["failed", "dead_letter"]),
    supabase.from("notification_jobs").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "failed"),
    supabase.from("queue_entries").select("id,client_name,service_slug,status,estimated_wait_minutes,joined_at,public_token").eq("business_id", businessId).in("status", ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"]).order("manual_priority", { ascending: true }).order("joined_at", { ascending: true }).limit(20),
    supabase.from("client_profiles").select("user_id,marketing_status,created_at,profiles(full_name,display_name,phone,preferred_language,status)").eq("business_id", businessId).order("created_at", { ascending: false }).limit(30),
    supabase.from("square_orders").select("id,square_id,state,total_cents,synced_at").eq("business_id", businessId).order("synced_at", { ascending: false }).limit(30),
    supabase.from("memberships").select("id,status,renews_at,client_user_id,membership_plans(name)").eq("business_id", businessId).order("created_at", { ascending: false }).limit(30),
    supabase.from("barber_profiles").select("id,slug,display_name,title,active,status").eq("business_id", businessId).order("sort_order", { ascending: true }).limit(50),
    supabase.from("integrations").select("provider,status,environment,last_success_at,last_error_at").eq("business_id", businessId).order("provider"),
    supabase.from("sync_failures").select("id,provider,resource_type,error_message,created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(10),
    supabase.from("square_payments").select("amount_cents,tip_cents,created_at_square").eq("business_id", businessId).gte("created_at_square", start.toISOString()).lt("created_at_square", end.toISOString()),
  ]);

  const paymentRows = (payments.data ?? []) as Array<Record<string, unknown>>;
  const revenue = paymentRows.reduce((sum, row) => sum + (typeof row.amount_cents === "number" ? row.amount_cents : 0), 0);
  const tips = paymentRows.reduce((sum, row) => sum + (typeof row.tip_cents === "number" ? row.tip_cents : 0), 0);
  const orderData = (orderRows.data ?? []) as Array<Record<string, unknown>>;

  return {
    configured: true,
    businessId,
    metrics: [
      { label: "Appointments today", value: String(countValue(bookings)), source: "Square-derived", note: "Synced booking records scheduled today" },
      { label: "Active queue", value: String(countValue(queueCount)), source: "Supabase-derived", note: "Waiting through in-service queue records" },
      { label: "Clients", value: String(countValue(clientCount)), source: "Supabase-derived", note: "Linked client profiles" },
      { label: "Active memberships", value: String(countValue(membershipCount)), source: "Supabase-derived", note: "Trial, active, paused, or past due" },
      { label: "Service revenue today", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(revenue / 100), source: "Square-derived", note: "Synced payments only" },
      { label: "Tips today", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(tips / 100), source: "Square-derived", note: "Outside Commission Basis" },
      { label: "Failed webhooks", value: String(countValue(failedWebhooks)), source: "Supabase-derived", note: "Failed or dead-letter events" },
      { label: "Failed messages", value: String(countValue(failedNotifications)), source: "Supabase-derived", note: "Notification jobs requiring attention" },
    ],
    queue: ((queueRows.data ?? []) as Array<Record<string, unknown>>),
    clients: ((clientRows.data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const joined = row.profiles;
      const profile = Array.isArray(joined) ? joined[0] as Record<string, unknown> | undefined : joined as Record<string, unknown> | undefined;
      return {
        id: String(row.user_id),
        name: s(profile?.display_name) ?? s(profile?.full_name) ?? "Unnamed client",
        phone: s(profile?.phone),
        language: s(profile?.preferred_language) ?? "en",
        marketing: s(row.marketing_status) ?? "unknown",
        createdAt: String(row.created_at),
      };
    }),
    orders: orderData.map((row) => ({ id: String(row.id), squareId: String(row.square_id), state: s(row.state) ?? "unknown", totalCents: typeof row.total_cents === "number" ? row.total_cents : null, syncedAt: String(row.synced_at) })),
    memberships: ((membershipRows.data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const joined = row.membership_plans;
      const plan = Array.isArray(joined) ? joined[0] as Record<string, unknown> | undefined : joined as Record<string, unknown> | undefined;
      return { id: String(row.id), status: s(row.status) ?? "pending", renewsAt: s(row.renews_at), plan: localizedName(plan?.name, "Membership"), clientId: String(row.client_user_id) };
    }),
    barbers: ((barberRows.data ?? []) as Array<Record<string, unknown>>).map((row) => ({ id: String(row.id), slug: String(row.slug), name: localizedName(row.display_name, "Barber"), title: localizedName(row.title, "Independent Barber"), active: Boolean(row.active), status: s(row.status) ?? "draft" })),
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
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken) return { configured: false, records: [], totals: [] };
  const supabase = createUserServerSupabase(session.accessToken);
  if (!supabase) return { configured: false, records: [], totals: [] };
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
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken) return null;
  const supabase = createUserServerSupabase(session.accessToken);
  if (!supabase) return null;
  const { data: business } = await supabase.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const businessId = s((business as Record<string, unknown> | null)?.id);
  if (!businessId) return null;
  const { data: client } = await supabase.from("client_profiles").select("user_id,favorite_barber_id,square_customer_id,marketing_status,grooming_preferences,profiles(full_name,display_name,phone,preferred_language,status)").eq("business_id", businessId).eq("user_id", id).maybeSingle();
  if (!client) return null;
  const row = client as Record<string, unknown>;
  const joined = row.profiles;
  const profile = (Array.isArray(joined) ? joined[0] : joined) as Record<string, unknown> | undefined;
  const customerId = s(row.square_customer_id);
  const [appointments, queueVisits, orders, memberships, consents, supportCases, tags, notes] = await Promise.all([
    supabase.from("booking_metadata").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("client_user_id", id),
    supabase.from("queue_entries").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("client_id", id),
    customerId ? supabase.from("square_orders").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("customer_square_id", customerId) : Promise.resolve({ count: 0 }),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("client_user_id", id),
    supabase.from("consent_records").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("user_id", id),
    supabase.from("support_cases").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("client_user_id", id),
    supabase.from("client_tags").select("tag").eq("business_id", businessId).eq("client_user_id", id).order("created_at", { ascending: false }),
    supabase.from("client_notes").select("id,note,visibility,created_at").eq("business_id", businessId).eq("client_user_id", id).order("created_at", { ascending: false }).limit(25),
  ]);
  return {
    configured: true,
    id,
    name: s(profile?.display_name) ?? s(profile?.full_name) ?? "Unnamed client",
    email: null,
    phone: s(profile?.phone),
    language: s(profile?.preferred_language) ?? "en",
    status: s(profile?.status) ?? "active",
    marketing: s(row.marketing_status) ?? "unknown",
    favoriteBarberId: s(row.favorite_barber_id),
    groomingPreferences: row.grooming_preferences && typeof row.grooming_preferences === "object" ? row.grooming_preferences as Record<string, unknown> : {},
    tags: ((tags.data ?? []) as Array<Record<string, unknown>>).map((item) => String(item.tag)),
    notes: ((notes.data ?? []) as Array<Record<string, unknown>>).map((item) => ({ id: String(item.id), note: String(item.note), visibility: String(item.visibility), createdAt: String(item.created_at) })),
    totals: { appointments: appointments.count ?? 0, queueVisits: queueVisits.count ?? 0, orders: orders.count ?? 0, memberships: memberships.count ?? 0, consents: consents.count ?? 0, supportCases: supportCases.count ?? 0 },
  };
}

export async function loadAdminBarberDetail(id: string) {
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken) return null;
  const supabase = createUserServerSupabase(session.accessToken);
  if (!supabase) return null;
  const { data: business } = await supabase.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const businessId = s((business as Record<string, unknown> | null)?.id);
  if (!businessId) return null;
  const { data } = await supabase.from("barber_profiles").select("id,staff_user_id,slug,display_name,professional_title,short_intro,biography,specialties,languages,square_team_member_id,active,status,featured").eq("business_id", businessId).eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const staffUserId = s(row.staff_user_id);
  const [appointments, queueAssignments, statements, disputes] = await Promise.all([
    staffUserId ? supabase.from("booking_metadata").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("barber_user_id", staffUserId) : Promise.resolve({ count: 0 }),
    staffUserId ? supabase.from("queue_assignments").select("id", { count: "exact", head: true }).eq("barber_user_id", staffUserId) : Promise.resolve({ count: 0 }),
    staffUserId ? supabase.from("settlement_statements").select("id", { count: "exact", head: true }).eq("barber_user_id", staffUserId) : Promise.resolve({ count: 0 }),
    staffUserId ? supabase.from("commission_disputes").select("id", { count: "exact", head: true }).eq("barber_user_id", staffUserId) : Promise.resolve({ count: 0 }),
  ]);
  return {
    id: String(row.id), staffUserId, slug: String(row.slug), name: localizedName(row.display_name, "Barber"), title: localizedName(row.professional_title, "Independent Barber"), intro: localizedName(row.short_intro, ""), biography: localizedName(row.biography, ""), specialties: Array.isArray(row.specialties) ? row.specialties.map(String) : [], languages: Array.isArray(row.languages) ? row.languages.map(String) : [], squareTeamMemberId: s(row.square_team_member_id), active: Boolean(row.active), status: s(row.status) ?? "draft", featured: Boolean(row.featured), totals: { appointments: appointments.count ?? 0, queueAssignments: queueAssignments.count ?? 0, statements: statements.count ?? 0, disputes: disputes.count ?? 0 },
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
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken) return [];
  const supabase = createUserServerSupabase(session.accessToken);
  if (!supabase) return [];
  const { data: business } = await supabase.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const businessId = s((business as Record<string, unknown> | null)?.id);
  if (!businessId) return [];
  const { data } = await supabase.from("automation_rules").select("id,name,key,trigger_key,channels,delay_seconds,active,test_mode,version").eq("business_id", businessId).order("updated_at", { ascending: false }).limit(100);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id), name: String(row.name), key: String(row.key), triggerKey: String(row.trigger_key), channels: Array.isArray(row.channels) ? row.channels.map(String) : [], delaySeconds: typeof row.delay_seconds === "number" ? row.delay_seconds : 0, active: Boolean(row.active), testMode: Boolean(row.test_mode), version: typeof row.version === "number" ? row.version : 1,
  }));
}
