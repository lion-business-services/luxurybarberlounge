# Admin Appointments

`/admin/appointments` is a concise shop-operations workspace, not a developer console.

## Views and filters

- Today and all dates
- Status
- Barber
- Source
- Search by client, phone, email, reference, service, or barber

## Actions

Authorized reception, manager, owner, and super-admin users can confirm, decline, cancel, check in, start service, complete, mark no-show, reassign an eligible barber, reschedule to a real open slot, add an internal note, and retry the administrative email.

Check-in creates a linked queue entry. Status and assignment changes write immutable history and audit rows. The workspace exposes delivery state without exposing provider secrets.
