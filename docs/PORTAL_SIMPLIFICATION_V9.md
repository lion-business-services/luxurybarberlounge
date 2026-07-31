# Portal Simplification v9

## Client portal

The client experience now has four primary destinations only:

- Home
- Visits
- Queue
- Account

Booking remains the single primary action. Membership, receipts, notifications, privacy, and help are grouped under Account instead of competing in the main navigation. The dashboard focuses on the next appointment, current queue state, membership state, and three quick actions.

## Shop operations dashboard

The admin experience is no longer presented as a full CRM. Daily navigation is limited to:

- Dashboard
- Appointments
- Queue
- Clients
- Barbers
- Commissions
- Automations
- Settings

Advanced provider, access, audit, order, service, and membership controls remain available through Settings so they do not clutter daily shop operations.

## Session continuity

`/api/auth/session` now silently renews an expired Supabase access token from the secure refresh-token cookie. The public header reads that session on navigation and shows Dashboard and Sign out when the visitor is authenticated. Moving between the public website and a portal therefore no longer makes the interface appear signed out.

## Security boundaries preserved

- Secure HttpOnly cookies remain the source of browser session state.
- Refresh tokens stay server-side.
- Role selection remains server-controlled.
- Client, manager, owner, barber, and reception authorization rules remain unchanged.
- Row Level Security remains the final data boundary.
