# Owner and Admin CRM

The admin CRM is a separate operational application under `/admin`, not a renamed client portal. It has its own layout, dense information architecture, server data loaders, tables, filters, operational actions, and owner-only governance boundaries.

## Manager operations

Managers may access business-scoped daily operations, appointments, queue, clients, barbers, services, orders, memberships, notifications, campaigns, content, reviews, and approved automation visibility.

## Owner-only governance

Nested server layouts protect integrations, webhooks, users, roles, permissions, audit, security, business settings, policies, attribution, commissions, statements, disputes, reconciliation, feature flags, data controls, and AI settings. Hiding a navigation item is not authorization.

## Functional controls

- Client CRM: create verified-email client access, permitted profile changes, notes, tags, status governance, and history.
- Queue: deterministic Who's Next, status changes, business-scoped manual assignment, reason capture, and audit.
- Barbers: profile/specialty/language control; owner-only provider mapping, suspension, and archival.
- Memberships: draft/version creation, provider-gated publication, and owner-approved completion of requests.
- Automations: owner-created test-mode rules, provider-gated activation, reason capture, and audit.
- Integrations: authorized status and failure surfaces without credential display.

Metrics are labeled Square-derived, Supabase-derived, Calculated, or Estimated. No demo values are represented as current operations.
