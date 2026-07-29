import test from "node:test";
import assert from "node:assert/strict";
import { estimateQueueWait, selectNextAssignment } from "../../src/lib/queue/engine.ts";

test("queue estimate divides active work across available barbers", () => {
  const result = estimateQueueWait({
    waiting: [
      { durationMinutes: 30, status: "waiting" },
      { durationMinutes: 45, status: "in_service" },
      { durationMinutes: 30, status: "cancelled" },
    ],
    serviceDurationMinutes: 45,
    availableBarbers: 2,
    bufferMinutes: 5,
  });
  assert.equal(result.estimatedWaitMinutes, 45);
  assert.equal(result.estimatedCompletionMinutes, 90);
  assert.equal(result.label, "estimate");
});

test("queue estimate remains non-negative with invalid inputs", () => {
  const result = estimateQueueWait({ waiting: [], serviceDurationMinutes: -1, availableBarbers: 0, scheduledLoadMinutes: -20 });
  assert.equal(result.estimatedWaitMinutes, 5);
  assert.equal(result.estimatedCompletionMinutes, 10);
});


test("who is next prioritizes a due scheduled appointment", () => {
  const decision = selectNextAssignment({
    now: "2026-07-29T14:00:00.000Z",
    ruleVersion: "queue-v1",
    entries: [
      { id: "walkin", durationMinutes: 30, status: "checked_in", joinedAt: "2026-07-29T13:00:00.000Z", serviceId: "cut" },
      { id: "appointment", durationMinutes: 30, status: "confirmed", joinedAt: "2026-07-29T13:50:00.000Z", appointmentAt: "2026-07-29T14:05:00.000Z", serviceId: "cut" },
    ],
    barbers: [
      { id: "barber-a", eligibleServiceIds: ["cut"], availableAt: "2026-07-29T14:00:00.000Z", activeLoadMinutes: 0, acceptingWalkIns: true },
    ],
  });
  assert.equal(decision?.queueEntryId, "appointment");
  assert.equal(decision?.barberId, "barber-a");
  assert.match(decision?.reasons.join(" ") ?? "", /scheduled appointment time is due/);
});

test("who is next honors an eligible preferred barber", () => {
  const decision = selectNextAssignment({
    now: "2026-07-29T14:00:00.000Z",
    ruleVersion: "queue-v1",
    entries: [
      { id: "client", durationMinutes: 30, status: "waiting", joinedAt: "2026-07-29T13:55:00.000Z", preferredBarberId: "barber-b", serviceId: "fade" },
    ],
    barbers: [
      { id: "barber-a", eligibleServiceIds: ["fade"], availableAt: "2026-07-29T14:00:00.000Z", activeLoadMinutes: 0, acceptingWalkIns: true },
      { id: "barber-b", eligibleServiceIds: ["fade"], availableAt: "2026-07-29T14:10:00.000Z", activeLoadMinutes: 15, acceptingWalkIns: true },
    ],
  });
  assert.equal(decision?.barberId, "barber-b");
  assert.match(decision?.reasons.join(" ") ?? "", /requested Barber/);
});
