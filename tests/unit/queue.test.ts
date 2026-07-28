import test from "node:test";
import assert from "node:assert/strict";
import { estimateQueueWait } from "../../src/lib/queue/engine.ts";

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
