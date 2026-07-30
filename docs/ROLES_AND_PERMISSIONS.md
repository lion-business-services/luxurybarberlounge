# Roles and Permissions

Authorization is enforced by protected server layouts, server route handlers, database role records, business scope, and Row Level Security. Navigation visibility is not an authorization boundary.

## Role precedence

When a verified user legitimately holds more than one role, the server resolves the primary role in this order:

1. Super administrator
2. Owner
3. Manager
4. Receptionist
5. Independent barber
6. Client

This prevents an owner who also has a client profile from being routed to the client dashboard by mistake.

## Client

Primary routes: `/client/**`

May access only their own:

- profile and grooming preferences
- appointments and appointment notes marked client-visible
- queue entry and estimate
- Square-linked orders, receipts, refund status, and support requests
- membership, usage, history, and membership requests
- notifications, communication preferences, consent history, referrals, rewards, feedback, and privacy requests

May not access any admin route, business-wide metric, other client, internal note, staff record, queue-control rule, integration state, audit log, attribution decision, commission calculation, or statement.

## Independent barber

Primary routes: `/barber/**`

May access permitted records for:

- own profile, services, locations, schedule, breaks, time off, and portfolio
- assigned appointments and operational client-service details
- own queue assignments
- imported-client roster and evidence claims
- own calculated amounts, statements, adjustments, disputes, and acknowledgements

May not edit attribution decisions, locked calculations, statements, historical financial records, owner policy, integrations, or business-wide client data.

## Receptionist

Primary routes: `/reception/**`

May access operational functions for:

- today and appointment lookup
- client lookup and permitted client creation
- check-in, walk-ins, queue, assignment, reassignment, and contact actions
- kiosk and shop-capacity operations

May not access owner-only policy, roles, integration credentials, commission governance, settlement, security configuration, or unrestricted financial reporting.

## Manager

Primary routes: approved `/admin/**` operational modules

May access business-scoped operations for:

- today, appointments, queue, clients, barbers, services, orders, memberships, notifications, campaigns, content, reviews, and delegated review tasks
- permitted profile updates and operational status changes
- business-scoped reporting that does not reveal owner-only credentials or governance

May not access owner-only integrations, webhooks, roles, permissions, audit governance, security configuration, attribution policy, commission rules, statement locking, dispute approval, reconciliation control, feature flags, data controls, or AI governance.

## Owner

Primary routes: `/admin/**`

Has complete business-scoped authority for:

- operations, clients, barbers, services, orders, memberships, campaigns, content, and analytics
- staff invitations, roles, permissions, suspension, and access governance
- integrations, webhooks, automation activation, system health, and failure recovery
- attribution, commission rules, calculations, adjustments, statements, disputes, reconciliation, and policy approvals
- audit, security, privacy, business settings, feature flags, data controls, and AI governance

Owner access is assigned only after OTP verification of `INITIAL_OWNER_EMAIL` and server-side role creation for the authenticated Supabase user ID.

## Super administrator

Reserved for exceptional platform operations. It must not be created through ordinary invitations or self-registration.

## Owner-only nested route families

The release protects these route families with owner or super-admin server layouts:

- `/admin/integrations/**`
- `/admin/webhooks/**`
- `/admin/users/**`
- `/admin/roles/**`
- `/admin/permissions/**`
- `/admin/audit/**` and `/admin/audit-logs/**`
- `/admin/security/**`
- `/admin/settings/**` and `/admin/business-settings/**`
- `/admin/policies/**`
- `/admin/attribution/**`
- `/admin/commissions/**`
- `/admin/statements/**`
- `/admin/disputes/**`
- `/admin/reconciliation/**`
- `/admin/feature-flags/**`
- `/admin/data-controls/**`
- `/admin/ai-settings/**`
- `/admin/sync-health/**` and `/admin/system-health/**`

## Invitation rules

- Ordinary verified signups receive client access only.
- Owner-created invitations may assign barber, receptionist, or manager.
- Invitations are consumed only after OTP verification by the exact invited email.
- Owner and super-admin cannot be assigned by invitation.
- Every role change, invitation, activation, suspension, and authorization failure is auditable.
