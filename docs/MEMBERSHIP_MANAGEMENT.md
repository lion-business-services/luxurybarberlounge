# Membership Management

## Client states

Clients see only provider-confirmed or explicitly pending states: pending, trial, active, paused, past due, cancelled, or expired. Upgrade, downgrade, pause, resume, activation, and cancellation are submitted as `membership_requests`; the interface does not claim billing success until the provider confirms it.

## Plan governance

The owner may create draft plans and historical `membership_plan_versions`. Publishing requires:

- `NEXT_PUBLIC_FEATURE_MEMBERSHIP_BILLING=true`
- a real Square catalog mapping
- approved price, renewal, usage, pause, and cancellation terms

Plan changes never rewrite historical transactions. Managers may review requests; only owner or super admin may mark provider action completed.
