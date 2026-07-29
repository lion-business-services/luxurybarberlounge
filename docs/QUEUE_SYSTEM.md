# Queue and Who’s Next

`src/lib/queue/engine.ts` implements deterministic, explainable assignment. It considers due booked appointment time, check-in/join order, explicit priority, preferred Barber, service eligibility, Barber availability, projected workload, and authorized override.

Statuses: waiting, confirmed, checked in, assigned, called, ready, in service, completed, cancelled, removed, no-show.

Each automatic assignment records queue entry, Barber, rule version, reasons, score, source, and decision time. Manual overrides record the authorized actor and reason. AI may summarize the decision but never chooses the final assignment.

Public queue displays privacy-safe tokens, status, estimated wait, and assigned Barber only when confirmed. Estimates are labeled as estimates, not guarantees.
