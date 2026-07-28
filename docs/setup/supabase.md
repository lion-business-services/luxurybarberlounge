# Supabase Setup

1. Create separate development, preview, and production Supabase projects.
2. Copy project URL and anonymous key to the public variables in `.env.local`.
3. Keep the service-role key server-only.
4. Link the CLI and apply migrations in order.
5. Apply the development seed only to non-production projects unless every demo record has been reviewed.
6. Configure email templates, redirect URLs, password policy, and MFA readiness.
7. Verify all RLS policies with client, barber, reception, manager, owner, and unauthenticated test users.
8. Configure storage CORS and signed-URL expiration according to business needs.

Never put the service-role key in `NEXT_PUBLIC_*` variables or a browser component.

The current provider-free portal shell is intentionally conservative. Before live portal activation, implement cookie-backed server sessions, auth callback exchange, invitation acceptance, session revocation, and role-aware redirect tests.
