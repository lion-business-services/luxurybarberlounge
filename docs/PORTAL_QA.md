# Portal QA

Validate each role with separate accounts and a clean browser session.

- **Client:** can view only their own appointments, queue entries, orders, membership data, and notifications; can use allowed reschedule/cancel actions.
- **Barber:** can view assigned appointments and authorized service details, but not owner analytics, unrelated clients, private administrative notes, or credentials.
- **Reception:** can operate appointments, check-in, queue, assignment, and operational client lookup without owner-only settings access.
- **Owner/Admin:** can manage appointments, clients, barbers, services, queue, integrations, automations, audit history, and settings.

Test phone, tablet, laptop, desktop, keyboard-only, screen reader, reduced motion, expired sessions, direct URL access, multiple tabs, reconnects, empty states, loading states, permission failures, and record isolation. Hidden navigation is not considered security; API authorization and RLS must enforce the same boundaries.
