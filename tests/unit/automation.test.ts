import test from "node:test";
import assert from "node:assert/strict";
import { canDeliver } from "../../src/lib/automation/engine.ts";

test("marketing SMS requires consent", () => {
  const decision = canDeliver({ transactional: false, channel: "sms", consent: { email: true, sms: false }, suppressed: false, now: new Date("2026-07-28T14:00:00") });
  assert.deepEqual(decision, { allowed: false, reason: "missing_consent" });
});

test("suppression wins even for transactional delivery", () => {
  const decision = canDeliver({ transactional: true, channel: "email", consent: { email: true, sms: true }, suppressed: true, now: new Date("2026-07-28T14:00:00") });
  assert.equal(decision.reason, "suppressed");
});

test("non-urgent marketing respects quiet hours", () => {
  const decision = canDeliver({ transactional: false, channel: "email", consent: { email: true, sms: true }, suppressed: false, now: new Date("2026-07-28T23:30:00"), quietHours: { startHour: 21, endHour: 8 } });
  assert.equal(decision.reason, "quiet_hours");
});
