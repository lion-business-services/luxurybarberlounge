# Database Architecture

## Migration order

1. `202607280001_foundation.sql` — identity, roles, permissions, businesses, locations, hours, consent
2. `202607280002_catalog_bookings_queue.sql` — services, Square references, booking extensions, queue
3. `202607280003_content_memberships_engagement.sql` — content, media, barber profiles, memberships, referrals, feedback, reviews
4. `202607280004_commissions_reconciliation.sql` — versioned attribution and commission rules, calculations, statements, disputes, reconciliation
5. `202607280005_crm_automation_integrations.sql` — leads, support, automation, messaging, campaigns, webhooks, feature flags, audit
6. `202607280006_rls_storage.sql` — RLS, grants, buckets, and storage policies

## Design principles

- UUID keys for business records; identity columns for append-only event histories.
- Business and location scope on operational tables.
- JSONB for localized copy, provider snapshots, and intentionally flexible configuration, not as a substitute for core relational keys.
- Version rows for attribution and commission rules.
- Immutable financial snapshots corrected through explicit adjustments.
- Sanitized webhook inbox with idempotency enforced by provider event ID.
- Append-only audit and status history.
- Indexes on business, status, date, barber, client, queue, and webhook retrieval paths.

## Seed data

`supabase/seed/seed.sql` is idempotent and contains the verified business, Northfield location, provisional hours, 31 services, demo barber profiles, draft memberships, templates, and disabled feature flags.

## Recovery

Migrations are additive. Before production migration:

1. Create a Supabase backup.
2. Apply to a preview project.
3. Run RLS tests and representative portal reads.
4. Review row counts and execution plans.
5. Apply to production during a controlled window.

Rollback should use a forward corrective migration. Do not delete or rewrite production financial history to “undo” a migration.
