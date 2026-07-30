# Queue and Assignment

## Queue

The public/client queue records name, verified client link when available, service, preference, consent snapshot, status, estimate basis, and timestamps. Clients see only their own queue record. Staff use `/admin/queue` or `/reception/queue`.

Supported states are waiting, confirmed, checked in, assigned, called, ready, in service, completed, cancelled, removed, and no-show.

## Who's Next

The deterministic engine considers scheduled timing, check-in order, manual priority, service eligibility, preferred barber, availability, and active load. Every automatic decision records the rule version, score, reasons, actor, and timestamp. Manual assignment validates both the queue entry and active barber within the same business and records an audit entry.

Assignment answers who serves the guest. Attribution answers commission treatment. They remain separate records.
