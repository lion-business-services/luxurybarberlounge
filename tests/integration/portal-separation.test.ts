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

test("client appointment mutations use provider confirmation and immutable history columns", async () => {
  const source = await readFile("src/app/api/client/appointments/route.ts", "utf8");
  assert.match(source, /provider\.updateBooking/);
  assert.match(source, /provider\.cancelBooking/);
  assert.match(source, /to_status:\s*"rescheduled"/);
  assert.match(source, /to_status:\s*"cancelled"/);
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

test("admin navigation is an operations dashboard rather than a full CRM menu", async () => {
  const shell = await readFile("src/components/admin/AdminShell.tsx", "utf8");
  for (const label of ["Dashboard", "Appointments", "Queue", "Clients", "Barbers", "Commissions", "Automations", "Settings"]) {
    assert.match(shell, new RegExp(`label: "${label}"`));
  }
  assert.doesNotMatch(shell, /Owner CRM|Executive dashboard|Marketing & CRM/);
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
