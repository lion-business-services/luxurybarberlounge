# Who Is Next

## Deterministic assignment

The queue engine evaluates scheduled appointment time, check-in time, preferred barber, First Available selection, service eligibility, current barber availability, workload, expected duration, breaks, fairness, and authorized overrides.

The engine uses explicit rules rather than an opaque AI decision. AI may assist with recommendations, but the recorded rule result determines assignment.

## Audit record

Each assignment records the client or privacy-safe queue identifier, barber, service, reason, rule version, timestamp, automatic or manual source, override user, and override reason where applicable.

## Ruben

Ruben participates in automatic First Available assignment only when his profile is active, the requested service is eligible, and an active schedule or real-time availability permits the work. Owner status never bypasses service, schedule, break, time-off, or conflict rules.
