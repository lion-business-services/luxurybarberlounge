import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const clientRoutes = [
  "src/app/client/page.tsx", "src/app/client/appointments/page.tsx", "src/app/client/queue/page.tsx",
  "src/app/client/orders/page.tsx", "src/app/client/membership/page.tsx", "src/app/client/profile/page.tsx",
];
const adminRoutes = [
  "src/app/admin/page.tsx", "src/app/admin/clients/page.tsx", "src/app/admin/orders/page.tsx",
  "src/app/admin/memberships/page.tsx", "src/app/admin/barbers/page.tsx", "src/app/admin/integrations/page.tsx",
];

test("client and admin are distinct applications with separate layouts and shells", async () => {
  await Promise.all([...clientRoutes, ...adminRoutes].map((route) => access(route)));
  const clientLayout = await readFile("src/app/client/layout.tsx", "utf8");
  const adminLayout = await readFile("src/app/admin/layout.tsx", "utf8");
  const clientShell = await readFile("src/components/client/ClientShell.tsx", "utf8");
  const adminShell = await readFile("src/components/admin/AdminShell.tsx", "utf8");
  assert.match(clientLayout, /ClientShell/);
  assert.match(adminLayout, /AdminShell/);
  assert.match(clientShell, /data-client-portal/);
  assert.match(adminShell, /data-admin-portal/);
  assert.doesNotMatch(clientShell, /Commission|Webhook|Audit|Role management/i);
});

test("owner role takes priority over a default client role", async () => {
  const config = await readFile("src/lib/auth/config.ts", "utf8");
  const server = await readFile("src/lib/auth/server.ts", "utf8");
  assert.match(config, /owner:\s*50/);
  assert.match(server, /selectPrimaryRole/);
  assert.match(server, /INITIAL_OWNER_EMAIL/);
});

test("future invitations cannot create another owner", async () => {
  const api = await readFile("src/app/api/admin/invitations/route.ts", "utf8");
  const panel = await readFile("src/components/admin/AdminUsersPanel.tsx", "utf8");
  assert.match(api, /z\.enum\(\["barber", "receptionist", "manager"\]\)/);
  assert.doesNotMatch(api, /z\.enum\([^\n]*"owner"/);
  assert.doesNotMatch(panel, /option value="owner"/);
});

test("owner-only routes are protected by nested server layouts", async () => {
  const routes = ["users", "roles", "audit", "security", "settings", "integrations", "webhooks", "commissions"];
  for (const route of routes) {
    const layout = `src/app/admin/${route}/layout.tsx`;
    await access(layout);
    const source = await readFile(layout, "utf8");
    assert.match(source, /OwnerOnlyGate/);
  }
  const gate = await readFile("src/components/admin/OwnerOnlyGate.tsx", "utf8");
  assert.match(gate, /\["owner", "super_admin"\]/);
});

test("portal operations migration adds history, privacy, order, and membership domains with RLS", async () => {
  const sql = await readFile("supabase/migrations/202607300009_portal_operations_privacy_and_history.sql", "utf8");
  for (const table of ["client_history_events", "privacy_requests", "order_extensions", "order_support_cases", "membership_requests", "appointment_assignments"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /profiles_operational_staff_read/);
  assert.match(sql, /client_preferences_staff_access/);
});

test("session metadata stores hashes and never raw access tokens", async () => {
  const source = await readFile("src/lib/auth/session-audit.ts", "utf8");
  assert.match(source, /createHash\("sha256"\)/);
  assert.match(source, /session_hash:\s*hashSensitive\(input\.accessToken\)/);
  assert.doesNotMatch(source, /access_token\s*:/);
});

test("client appointment mutations use atomic Supabase booking operations and immutable history columns", async () => {
  const source = await readFile("src/app/api/client/appointments/route.ts", "utf8");
  assert.match(source, /reschedule_appointment_atomic/);
  assert.match(source, /searchSupabaseAvailability/);
  assert.match(source, /cancelled_by_client/);
  assert.match(source, /to_status:\s*"cancelled_by_client"/);
  assert.doesNotMatch(source, /appointment_status_history"\)\.insert\([^\n]*\bstatus:/);
});

test("owner automation controls are provider-gated and audited", async () => {
  const createRoute = await readFile("src/app/api/admin/automations/route.ts", "utf8");
  const updateRoute = await readFile("src/app/api/admin/automations/[id]/route.ts", "utf8");
  assert.match(createRoute, /ownerOnly:\s*true/);
  assert.match(createRoute, /test_mode:\s*true/);
  assert.match(updateRoute, /Configure Resend before activating email automations/);
  assert.match(updateRoute, /before_data/);
  assert.match(updateRoute, /after_data/);
});

test("audit writes use the canonical immutable before and after columns", async () => {
  const files = [
    "src/app/api/admin/barbers/[id]/route.ts",
    "src/app/api/admin/clients/[id]/route.ts",
    "src/app/api/admin/memberships/route.ts",
    "src/app/api/admin/membership-requests/[id]/route.ts",
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /old_values|new_values/);
  }
});

test("client portal exposes only four primary destinations and a direct sign-out", async () => {
  const shell = await readFile("src/components/client/ClientShell.tsx", "utf8");
  for (const label of ["Home", "Visits", "Queue", "Account"]) assert.match(shell, new RegExp(`label: "${label}"`));
  assert.doesNotMatch(shell, /label: "Rewards"|label: "Offers"|label: "Notifications"|label: "Services"/);
  assert.match(shell, /\/api\/auth\/logout/);
});

test("admin navigation stays focused on daily barbershop operations", async () => {
  const shell = await readFile("src/components/admin/AdminShell.tsx", "utf8");
  for (const label of ["Dashboard", "Appointments", "Queue", "Clients", "Barbers", "Services", "Memberships", "Commissions"]) {
    assert.match(shell, new RegExp(`label: "${label}"`));
  }
  assert.doesNotMatch(shell, /label: "Automations"|label: "Settings"|Owner CRM|Executive dashboard|Marketing & CRM/);
});

test("public queue display exposes only privacy-safe operational fields", async () => {
  const route = await readFile("src/app/api/queue/display/route.ts", "utf8");
  const board = await readFile("src/app/queue-board/QueueBoard.tsx", "utf8");
  assert.match(route, /privacySafeQueueLabel/);
  assert.match(route, /publicDisplayConsent/);
  assert.match(route, /assignedBarberName/);
  assert.doesNotMatch(route, /client_phone|client_email|phone:|email:/);
  assert.match(board, /Names appear only when the guest has chosen to share/);
  assert.match(board, /requestFullscreen/);
});

test("admin hides workflow configuration while protected background processors remain", async () => {
  const automationPage = await readFile("src/app/admin/automations/page.tsx", "utf8");
  const settingsPage = await readFile("src/app/admin/settings/page.tsx", "utf8");
  const vercel = await readFile("vercel.json", "utf8");
  assert.match(automationPage, /redirect\("\/admin"\)/);
  assert.match(settingsPage, /redirect\("\/admin"\)/);
  for (const path of ["/api/cron/webhooks", "/api/cron/notifications", "/api/cron/appointments", "/api/cron/queue", "/api/cron/commissions"]) {
    assert.match(vercel, new RegExp(path.replaceAll("/", "\\/")));
  }
});

test("client portal does not surface internal provider identifiers", async () => {
  const clientData = await readFile("src/lib/portal/client-data.ts", "utf8");
  const clientPages = await readFile("src/components/client/ClientPages.tsx", "utf8");
  assert.doesNotMatch(clientData, /squareCustomerId:/);
  assert.doesNotMatch(clientPages, /Square customer link|Square matching/);
});

test("barber service eligibility drives explainable automatic queue assignment", async () => {
  const editor = await readFile("src/components/admin/AdminBarberEditor.tsx", "utf8");
  const barberApi = await readFile("src/app/api/admin/barbers/[id]/route.ts", "utf8");
  const queueEngine = await readFile("src/lib/queue/engine.ts", "utf8");
  assert.match(editor, /Services this barber can perform/);
  assert.match(barberApi, /staff_services/);
  assert.match(barberApi, /serviceIds/);
  assert.match(queueEngine, /eligibleServiceIds/);
  assert.match(queueEngine, /lowest eligible projected workload/);
});

test("commission processor prepares provisional barber statements without moving money", async () => {
  const processor = await readFile("src/lib/commissions/reconcile.ts", "utf8");
  const workspace = await readFile("src/components/commissions/CommissionWorkspace.tsx", "utf8");
  assert.match(processor, /settlement_statements/);
  assert.match(processor, /manual_zelle_or_cash/);
  assert.match(processor, /status: "provisional"/);
  assert.match(workspace, /Statements report amounts only and do not move funds/);
});

test("public navigation silently renews sessions and keeps dashboard and sign-out available", async () => {
  const sessionRoute = await readFile("src/app/api/auth/session/route.ts", "utf8");
  const header = await readFile("src/components/Header.tsx", "utf8");
  assert.match(sessionRoute, /refreshSession/);
  assert.match(sessionRoute, /setAuthCookies/);
  assert.match(header, /portalUrl/);
  assert.match(header, /Dashboard/);
  assert.match(header, /\/api\/auth\/logout/);
});

test("queue updates create consent-aware transactional notifications", async () => {
  const helper = await readFile("src/lib/queue/notifications.ts", "utf8");
  const operations = await readFile("src/app/api/operations/queue/route.ts", "utf8");
  const processor = await readFile("src/app/api/cron/notifications/route.ts", "utf8");
  assert.match(helper, /auth\.admin\.getUserById/);
  assert.match(helper, /features\.sms && input\.smsConsent/);
  assert.match(helper, /queue:\$\{input\.entryId\}:\$\{input\.status\}/);
  assert.match(operations, /enqueueQueueStatusNotification/);
  assert.match(processor, /payload\.smsConsent === true/);
});

test("queue television route never returns private contact fields", async () => {
  const display = await readFile("src/app/api/queue/display/route.ts", "utf8");
  assert.doesNotMatch(display, /clientId|clientPhone|smsConsent|client_name|client_phone|service:/);
  assert.match(display, /Cache-Control/);
  assert.match(display, /private, no-store/);
});


test("booking confirmations and 24-hour reminders are generated in protected background jobs", async () => {
  const webhook = await readFile("src/lib/integrations/processSquareWebhook.ts", "utf8");
  const reminders = await readFile("src/lib/appointments/reminders.ts", "utf8");
  const cron = await readFile("src/app/api/cron/appointments/route.ts", "utf8");
  assert.match(webhook, /Your Luxury Barber Lounge appointment/);
  assert.match(webhook, /transactional: true/);
  assert.match(reminders, /booking_reminder_24h/);
  assert.match(reminders, /businessConfig\.timezone/);
  assert.match(cron, /CRON_SECRET/);
});
