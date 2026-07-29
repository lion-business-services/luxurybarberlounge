# Architecture

Luxury Barber Lounge is a Next.js 16 App Router application with four boundaries:

1. **Public experience**: cinematic marketing pages, services, real barber profiles, booking handoff, queue request, concierge, SEO, and local-business content.
2. **Authenticated workspaces**: client, independent barber, reception, manager, and owner/admin portals.
3. **Operational data**: Supabase Postgres, Auth, Storage, RLS, audit history, attribution, queue extensions, commission calculations, statements, disputes, notifications, content, and configuration.
4. **External sources of truth**: Square for catalog, availability, bookings, orders, payments, tips, refunds, and operational transaction status; Resend-backed Supabase SMTP for OTP email; optional SMS and AI providers behind interfaces and feature flags.

## Request flow

- Public pages are server rendered where practical.
- Cinematic homepage code is dynamically isolated from portal routes.
- `/proxy.ts` is an optimistic cookie gate only. Portal layouts validate the authenticated user and authorized role on the server. RLS remains the final data boundary.
- Browser code receives only public Supabase configuration. The service-role key is server-only.
- Square and provider secrets are read only in server modules and route handlers.
- All financial values are integer cents in application logic and `numeric`/integer-safe fields in Postgres.

## Source-of-truth rules

- Canonical business information: `src/lib/content/site.ts`.
- Public service/barber content: centralized content records and published database content when Supabase is activated.
- Square: operational and financial records.
- Supabase: identity, extended profiles, portal data, attribution, policy versions, calculations, queue extensions, automation, and audit records.
- Commission policy registry: `src/lib/policy/commissionPolicy.ts` plus effective-dated database records.

## Important invariants

- Unresolved client-and-Barber attribution is SHOP.
- Locked calculation lines are never updated or deleted.
- Corrections are separate Adjustments.
- Proposed and open policy terms are disabled until owner approval.
- The platform calculates and reports settlement amounts; it does not move money.
- AI may explain or draft. It is not the final authority for queue assignment, attribution, commissions, policy, refunds, or authorization.
