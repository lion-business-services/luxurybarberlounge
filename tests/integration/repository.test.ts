import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredRoutes = [
  "src/app/page.tsx",
  "src/app/services/page.tsx",
  "src/app/barbers/page.tsx",
  "src/app/book/page.tsx",
  "src/app/walk-ins/page.tsx",
  "src/app/client/page.tsx",
  "src/app/barber/page.tsx",
  "src/app/reception/page.tsx",
  "src/app/admin/page.tsx",
  "src/app/api/health/route.ts",
  "src/app/our-story/page.tsx",
  "src/app/api/auth/request-otp/route.ts",
  "src/app/api/auth/verify-otp/route.ts",
  "src/app/api/operations/queue/route.ts",
  "src/app/api/attribution/claims/route.ts",
  "src/app/api/commissions/statements/route.ts",
  "src/app/api/admin/invitations/route.ts",
  "src/app/api/admin/webhooks/route.ts",
  "src/app/api/cron/webhooks/route.ts",
  "src/app/api/account/requests/route.ts",
  "src/app/api/policy/acknowledgements/route.ts",
];

test("primary public and portal routes exist", async () => {
  await Promise.all(requiredRoutes.map((route) => access(route)));
});

test("ordered Supabase migration set is present", async () => {
  const migrations = [
    "supabase/migrations/202607280001_foundation.sql",
    "supabase/migrations/202607280002_catalog_bookings_queue.sql",
    "supabase/migrations/202607280003_content_memberships_engagement.sql",
    "supabase/migrations/202607280004_commissions_reconciliation.sql",
    "supabase/migrations/202607280005_crm_automation_integrations.sql",
    "supabase/migrations/202607280006_rls_storage.sql",
    "supabase/migrations/202607290007_policy_auth_operational_completion.sql",
  ];
  await Promise.all(migrations.map((migration) => access(migration)));
});

test("environment template never contains committed secret values", async () => {
  const env = await readFile(".env.example", "utf8");
  assert.doesNotMatch(env, /sk_live_|sq0atp-|service_role_[A-Za-z0-9]/);
  assert.match(env, /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.match(env, /SQUARE_ACCESS_TOKEN=/);
});


test("passwordless authentication and role protection are server controlled", async () => {
  const auth = await readFile("src/app/api/auth/verify-otp/route.ts", "utf8");
  const server = await readFile("src/lib/auth/server.ts", "utf8");
  const proxy = await readFile("src/proxy.ts", "utf8");
  assert.match(auth, /verifyOtp/);
  assert.match(server, /INITIAL_OWNER_EMAIL/);
  assert.match(server, /user_roles/);
  assert.match(proxy, /protectedRoots/);
  assert.doesNotMatch(proxy, /info@theluxurybarberlounge\.com/);
});

test("policy migration keeps proposed and open rules owner controlled", async () => {
  const sql = await readFile("supabase/migrations/202607290007_policy_auth_operational_completion.sql", "utf8");
  assert.match(sql, /rule_state in \('locked','proposed','open'\)/);
  assert.match(sql, /policy_open_items/);
  assert.match(sql, /prevent_locked_calculation_change/);
  assert.match(sql, /create policy claims_barber_insert/);
  assert.match(sql, /create policy attributions_admin_write/);
  for (const line of sql.split("\n").filter((item) => /^\s*create policy/i.test(item))) {
    assert.equal((line.match(/\(/g) ?? []).length, (line.match(/\)/g) ?? []).length, `Unbalanced policy SQL: ${line}`);
  }
});

test("required production setup documents exist", async () => {
  const docs = [
    "docs/SUPABASE_SETUP.md",
    "docs/RESEND_OTP_SETUP.md",
    "docs/SQUARE_SETUP.md",
    "docs/AUTHENTICATION.md",
    "docs/QUEUE_SYSTEM.md",
    "docs/COMMISSION_POLICY_SETUP.md",
    "docs/OWNER_OPEN_DECISIONS.md",
    "docs/DEPLOYMENT.md",
  ];
  await Promise.all(docs.map((document) => access(document)));
});


test("staff invitations are consumed only after verified OTP login", async () => {
  const server = await readFile("src/lib/auth/server.ts", "utf8");
  const invitations = await readFile("src/app/api/admin/invitations/route.ts", "utf8");
  assert.match(server, /consumePendingInvitation/);
  assert.match(server, /staff_invitation_accepted/);
  assert.match(invitations, /intended_role/);
  assert.doesNotMatch(invitations, /password/);
});

test("webhook inbox has signature validation, idempotency, processing, and retry surfaces", async () => {
  const receiver = await readFile("src/app/api/square/webhooks/route.ts", "utf8");
  const processor = await readFile("src/lib/integrations/processSquareWebhook.ts", "utf8");
  const admin = await readFile("src/app/api/admin/webhooks/route.ts", "utf8");
  assert.match(receiver, /verifySquareWebhook/);
  assert.match(receiver, /provider_event_id/);
  assert.match(processor, /webhook_attempts/);
  assert.match(processor, /dead_letter/);
  assert.match(admin, /retry/);
});

test("authenticated privacy and policy acknowledgement workflows are present", async () => {
  const privacy = await readFile("src/app/api/account/requests/route.ts", "utf8");
  const acknowledgement = await readFile("src/app/api/policy/acknowledgements/route.ts", "utf8");
  assert.match(privacy, /data_export/);
  assert.match(privacy, /account_deletion/);
  assert.match(acknowledgement, /approved.*published/);
  assert.match(acknowledgement, /policy_acknowledgements/);
});
