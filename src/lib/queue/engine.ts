export type QueueWorkItem = {
  durationMinutes: number;
  status: "waiting" | "assigned" | "called" | "checked_in" | "in_service" | "completed" | "no_show" | "cancelled" | "removed";
  priority?: number;
};

export type QueueEstimateInput = {
  waiting: QueueWorkItem[];
  serviceDurationMinutes: number;
  availableBarbers: number;
  scheduledLoadMinutes?: number;
  bufferMinutes?: number;
};

/** Returns an operational estimate, never a guarantee. */
export function estimateQueueWait(input: QueueEstimateInput) {
  const activeItems = input.waiting.filter((item) => !["completed", "no_show", "cancelled", "removed"].includes(item.status));
  const barberCount = Math.max(1, Math.floor(input.availableBarbers));
  const workAhead = activeItems.reduce((sum, item) => sum + Math.max(0, item.durationMinutes), 0) + Math.max(0, input.scheduledLoadMinutes ?? 0);
  const buffer = Math.max(0, input.bufferMinutes ?? 5);
  const estimate = Math.ceil((workAhead / barberCount + buffer) / 5) * 5;
  const serviceDuration = Math.max(5, input.serviceDurationMinutes);
  return {
    estimatedWaitMinutes: Math.max(0, estimate),
    estimatedCompletionMinutes: Math.max(0, estimate) + serviceDuration,
    label: "estimate" as const,
  };
}
