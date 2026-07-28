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
  ];
  await Promise.all(migrations.map((migration) => access(migration)));
});

test("environment template never contains committed secret values", async () => {
  const env = await readFile(".env.example", "utf8");
  assert.doesNotMatch(env, /sk_live_|sq0atp-|service_role_[A-Za-z0-9]/);
  assert.match(env, /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.match(env, /SQUARE_ACCESS_TOKEN=/);
});
