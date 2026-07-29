# Owner and Admin CRM

The CRM contains executive overview, bookings, walk-ins, queue, clients, staff, services, pricing, hours, memberships, content, reviews, campaigns, automations, attribution, commissions, reconciliation, Statements, disputes, integrity flags, integrations, webhooks, users, roles, permissions, audit logs, feature flags, policy approvals, and business/security settings.

Metrics must be labeled Live, Square-derived, Supabase-derived, Calculated, Estimated, or Demo. Demo values are never represented as current business performance.

Owner-only actions require server authorization and are audited. Proposed policy terms remain disabled until explicitly approved with an effective date.

## Functional operational controls

- `/admin/users` creates and revokes verified-email staff invitations and reviews assigned roles.
- `/admin/webhooks` reviews signature-verified events, attempts, failures, retries, and dead-letter records.
- `/admin/policies` records owner decisions without activating unresolved rules.
- `/admin/queue`, `/admin/attribution`, and `/admin/commissions` use deterministic domain engines and audited writes.
