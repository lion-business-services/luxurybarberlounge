# Realtime Updates

Supabase Realtime is used, when enabled in the deployed project, for appointment creation and changes, check-in, queue entry, assignment, ready state, service start, completion, cancellation, and barber availability.

Admin, client, barber, reception, and privacy-safe in-shop views subscribe only to records their roles are authorized to read. Reconnection logic refreshes canonical state after a dropped connection. Event handlers tolerate duplicate or out-of-order events and avoid using a transient message as the sole source of truth.

Realtime is an operational acceleration layer, not the booking database. Stored Supabase records, status-transition rules, audit history, and RLS remain canonical. Staff should not need to refresh manually, but a refresh must reconstruct the same state from persisted data.
