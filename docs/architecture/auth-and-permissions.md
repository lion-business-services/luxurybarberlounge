# Authentication and Permissions

## Roles

- Visitor
- Client
- Barber
- Receptionist
- Manager
- Owner
- Super administrator

New public auth users receive only the client role through the `handle_new_auth_user` trigger. Staff roles are assigned by an authorized owner or super administrator and written to the audit trail.

## Enforcement layers

1. Portal route gate prevents accidental production exposure while auth activation is incomplete.
2. Server routes validate authenticated identity and role before privileged work.
3. Supabase Row Level Security is the authoritative data boundary.
4. UI capability checks improve usability but are never treated as authorization.

## Role boundaries

- Clients see only their own records and client-visible notes.
- Barbers see their own schedule, assigned operational context, portfolio, calculations, statements, and disputes.
- Reception staff operate bookings, queue, check-in, and communication but cannot configure commissions, secrets, or roles.
- Managers operate approved locations and content capabilities.
- Owners manage business-wide financial rules, integrations, permissions, settings, and audit history.
- Super administrator access is exceptional, logged, and not intended for daily operations.

## Activation note

The repository intentionally avoids pretending a credential-free auth interface is a live identity system. Enable Supabase Auth, callback handling, server-session cookies, and staff invitation workflows according to `docs/setup/supabase.md` before opening production portals.
