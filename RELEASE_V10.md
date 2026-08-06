# Luxury Barber Lounge v10

## Completed

- Persistent Supabase sessions across public and protected pages.
- Separate, concise four-destination client portal.
- Simplified owner operations dashboard without CRM, automation, or settings navigation.
- Privacy-safe public queue API and full-screen in-shop queue board showing only the consented guest label/token, assigned barber, status, and estimate.
- Five-second queue refresh, deterministic assignment, wait recalculation, manual override, status history, and audit logs.
- Barber daily availability, walk-in acceptance, and service eligibility management.
- Service and membership operational management.
- Provider-confirmed commission reconciliation using the owner-approved 70/30 and 100% attribution policy.
- Automatic provisional weekly barber statements without moving money.
- Protected recurring jobs for webhooks, message delivery, 24-hour appointment reminders, queue recovery, and commission calculations.
- Transactional queue assignment and called/ready notifications through approved email or consented SMS channels.
- New migration `202607310010_operational_queue_display.sql`.

## External activation still required

- Apply migration `202607310010` to Supabase.
- Enable queue and kiosk feature flags in Vercel.
- Enter final service prices and real barber identities.
- Connect and test production Square credentials, location, catalog, team-member mappings, and webhook signature.
- Enable Square and membership billing flags only after provider tests pass.

No secret credentials are included in this release.
