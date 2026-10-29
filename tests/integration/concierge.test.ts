import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function source(path: string) {
  return readFile(path, "utf8");
}

test("the concierge books and pays through the same routes as the booking page", async () => {
  const widget = await source("src/components/public/ConciergeWidget.tsx");
  assert.match(widget, /\/api\/concierge/);
  assert.match(widget, /\/api\/booking\/submit/);
  assert.match(widget, /\/api\/booking\/payment-link/);
  assert.match(widget, /idempotencyKey/);
  assert.match(widget, /policyVersion: businessConfig\.bookingPolicyVersion/);
  assert.match(widget, /alternatives/);
  assert.doesNotMatch(widget, /SUPABASE_SERVICE_ROLE_KEY|SQUARE_ACCESS_TOKEN|CONCIERGE_AI_API_KEY/);
  // The conversation engine only reaches the browser as types.
  assert.match(widget, /import type \{[^}]+\} from "@\/lib\/concierge\/engine"/);
});

test("the concierge never states a price, time or barber that is not from live records", async () => {
  const engine = await source("src/lib/concierge/engine.ts");
  assert.doesNotMatch(engine, /\$\d{2,}/, "no hard-coded prices in the engine");
  assert.match(engine, /findSlots/);
  assert.match(engine, /priceCents/);
  const route = await source("src/app/api/concierge/route.ts");
  assert.match(route, /getBookingCatalog/);
  assert.match(route, /searchSupabaseAvailability/);
  assert.match(route, /rateLimit/);
  assert.match(route, /no-store/);
});

test("the optional model interpreter is server-only, validated and off without a key", async () => {
  const interpreter = await source("src/lib/concierge/interpret.ts");
  assert.match(interpreter, /import "server-only"/);
  assert.match(interpreter, /CONCIERGE_AI_API_KEY/);
  assert.match(interpreter, /safeParse/);
  assert.match(interpreter, /serviceSlugs\.has/);
  assert.match(interpreter, /AbortController/);
});

test("the chat can always be reset from the header and under the message box", async () => {
  const widget = await source("src/components/public/ConciergeWidget.tsx");
  assert.match(widget, /restart: \{ en: "New chat", es: "Nuevo chat" \}/);
  assert.equal((widget.match(/onClick=\{restart\}/g) ?? []).length, 2);
});
