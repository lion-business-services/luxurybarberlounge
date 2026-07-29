export type QueueStatus = "waiting" | "confirmed" | "checked_in" | "assigned" | "called" | "ready" | "in_service" | "completed" | "cancelled" | "removed" | "no_show";

export type QueueWorkItem = {
  id?: string;
  durationMinutes: number;
  status: QueueStatus;
  priority?: number;
  joinedAt?: string;
  appointmentAt?: string | null;
  preferredBarberId?: string | null;
  serviceId?: string | null;
};

export type QueueEstimateInput = {
  waiting: QueueWorkItem[];
  serviceDurationMinutes: number;
  availableBarbers: number;
  scheduledLoadMinutes?: number;
  bufferMinutes?: number;
};

export type AssignmentBarber = {
  id: string;
  eligibleServiceIds: string[];
  availableAt: string;
  activeLoadMinutes: number;
  acceptingWalkIns: boolean;
};

export type AssignmentDecision = {
  queueEntryId: string;
  barberId: string;
  ruleVersion: string;
  source: "automatic";
  reasons: string[];
  score: number;
  decidedAt: string;
};

/** Returns an operational estimate, never a guarantee. */
export function estimateQueueWait(input: QueueEstimateInput) {
  const activeItems = input.waiting.filter((item) => !["completed", "no_show", "cancelled", "removed"].includes(item.status));
  const barberCount = Math.max(1, Math.floor(input.availableBarbers));
  const workAhead = activeItems.reduce((sum, item) => sum + Math.max(0, item.durationMinutes), 0) + Math.max(0, input.scheduledLoadMinutes ?? 0);
  const buffer = Math.max(0, input.bufferMinutes ?? 5);
  const estimate = Math.ceil((workAhead / barberCount + buffer) / 5) * 5;
  const serviceDuration = Math.max(5, input.serviceDurationMinutes);
  return { estimatedWaitMinutes: Math.max(0, estimate), estimatedCompletionMinutes: Math.max(0, estimate) + serviceDuration, label: "estimate" as const };
}

/**
 * Deterministic and explainable Who's Next decision. AI may summarize this
 * output, but never chooses the final queue position or assignment.
 */
export function selectNextAssignment(input: {
  entries: QueueWorkItem[];
  barbers: AssignmentBarber[];
  now: string;
  ruleVersion: string;
}): AssignmentDecision | null {
  const nowMs = Date.parse(input.now);
  const activeEntries = input.entries
    .filter((entry): entry is QueueWorkItem & { id: string } => Boolean(entry.id) && ["waiting", "confirmed", "checked_in"].includes(entry.status))
    .sort((left, right) => {
      const leftAppointment = left.appointmentAt ? Date.parse(left.appointmentAt) : Number.POSITIVE_INFINITY;
      const rightAppointment = right.appointmentAt ? Date.parse(right.appointmentAt) : Number.POSITIVE_INFINITY;
      const leftScheduledDue = leftAppointment <= nowMs + 15 * 60_000;
      const rightScheduledDue = rightAppointment <= nowMs + 15 * 60_000;
      if (leftScheduledDue !== rightScheduledDue) return leftScheduledDue ? -1 : 1;
      if ((left.priority ?? 100) !== (right.priority ?? 100)) return (left.priority ?? 100) - (right.priority ?? 100);
      return Date.parse(left.joinedAt ?? input.now) - Date.parse(right.joinedAt ?? input.now);
    });

  for (const entry of activeEntries) {
    const candidates = input.barbers
      .filter((barber) => barber.acceptingWalkIns)
      .filter((barber) => !entry.serviceId || barber.eligibleServiceIds.includes(entry.serviceId))
      .map((barber) => {
        const preferenceBonus = entry.preferredBarberId === barber.id ? 10_000 : 0;
        const availableMs = Date.parse(barber.availableAt);
        const availabilityPenalty = Math.max(0, Math.round((availableMs - nowMs) / 60_000));
        const score = preferenceBonus - availabilityPenalty * 20 - Math.max(0, barber.activeLoadMinutes);
        return { barber, score, availabilityPenalty, preferred: preferenceBonus > 0 };
      })
      .sort((left, right) => right.score - left.score || left.barber.id.localeCompare(right.barber.id));
    const selected = candidates[0];
    if (!selected) continue;
    const reasons = [entry.appointmentAt && Date.parse(entry.appointmentAt) <= nowMs + 15 * 60_000 ? "scheduled appointment time is due" : "earliest eligible checked-in or waiting client"];
    if (selected.preferred) reasons.push("requested Barber is eligible and available");
    else reasons.push("lowest eligible projected workload");
    if (entry.serviceId) reasons.push("Barber is eligible for the requested service");
    return { queueEntryId: entry.id, barberId: selected.barber.id, ruleVersion: input.ruleVersion, source: "automatic", reasons, score: selected.score, decidedAt: input.now };
  }
  return null;
}
