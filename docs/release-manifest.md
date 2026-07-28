# Release Manifest

- **Release:** 2026-07-28
- **Page routes:** 145
- **Supabase migrations:** 6
- **Unit tests:** 21 passed, 0 failed
- **Integration tests:** 3 passed, 0 failed
- **Source release gates:** Passed

## Migration files

- `202607280001_foundation.sql`
- `202607280002_catalog_bookings_queue.sql`
- `202607280003_content_memberships_engagement.sql`
- `202607280004_commissions_reconciliation.sql`
- `202607280005_crm_automation_integrations.sql`
- `202607280006_rls_storage.sql`

## Brand assets

- `lbl-crest.png`
- `lbl-crest.webp`
- `lbl-logo-full.png`
- `lbl-logo-full.webp`
- `logo-official-transparent.png`
- `logo-official-transparent.webp`
- `luxury-barber-crest.png`
- `luxury-barber-logo.png`

## Cinematic hero assets

- `craft-tools.webp`
- `crest-reveal-poster.webp`
- `crest-reveal.mp4`
- `lounge-chair.webp`
- `lounge-wall.webp`
- `mirror-station.webp`
- `scene-advance.webp`

## Route families

- Public marketing, services, barber profiles, booking, walk-ins, membership, packages, gift cards, gallery, reviews, contact, visit, journal, events, products, careers, legal, and authentication
- Client account and appointment workspace
- Barber schedule, client, portfolio, performance, revenue, commission, statement, and dispute workspace
- Reception schedule, check-in, queue, communication, kiosk, and shop-status workspace
- Owner/admin CRM, operations, content, marketing, analytics, integrations, permissions, audit, and system controls

The full route tree is under `src/app`. Dynamic routes preserve clean service, barber, location, journal, and queue-status URLs.
