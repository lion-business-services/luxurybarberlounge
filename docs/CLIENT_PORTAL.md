# Client Portal

The client portal is a separate mobile-first application under `/client`. It does not reuse the admin CRM layout, navigation, dashboard, data queries, terminology, or operational controls.

## Primary experience

The dashboard prioritizes the next appointment, personal queue status, rebooking, favorite barber, membership state, recent history, receipt/order state, notifications, and contact actions. It avoids dense charts and business-wide metrics.

## Modules

- Appointments: upcoming/past detail, add-to-calendar, provider-confirmed reschedule/cancel, and rebooking.
- Queue: join where enabled, view only the authenticated guest's status and estimate, and leave when policy permits.
- Orders: own Square-linked orders, receipt references, refund state, and support requests.
- Membership: plans and real membership state; changes are requests until provider confirmation.
- Profile and grooming profile: permitted identity, language, barber, preference, consent, and communication updates.
- History: own appointments, services, orders, memberships, queue visits, notifications, support, and privacy requests.
- Privacy: canonical export/deletion requests in `privacy_requests`.

## Security

Protected layouts authorize the role before rendering. Client queries use the authenticated Supabase JWT and RLS. No other-client record, internal note, audit log, commission rule, integration state, or administrative metric is included in the client payload.
