# System Architecture

## Boundaries

The platform is divided into four layers:

1. **Public experience** — statically rendered and server-rendered marketing routes, cinematic motion, conversion paths, service/barber discovery, truthful development fallbacks.
2. **Role-aware workspaces** — client, barber, reception, and owner/admin route groups. The credential-free build provides clearly marked seeded interfaces; production data access is expected through server functions and Supabase RLS.
3. **Business rules** — provider-neutral booking, deterministic attribution, deterministic commission calculation, queue rules, automation catalog, feature flags, validation, and audit conventions.
4. **External providers** — Supabase, Square, email, SMS, AI, analytics. Every provider is optional at render time and has an explicit development or unavailable state.

## Runtime responsibilities

- **Next.js Server Components** render stable content and metadata.
- **Focused Client Components** handle animation, filters, booking forms, queue interactions, and portal UI state.
- **API routes** validate public requests, invoke provider adapters, and return sanitized outcomes.
- **Supabase service-role operations** are server-only.
- **Square requests and webhook verification** are server-only.

## Source of truth

Square, once connected, is authoritative for operational and financial records. Supabase mirrors identifiers and stores extension data; it must not silently overwrite canonical Square financial history.

## Credential-free mode

The public website renders without provider credentials. Development providers return explicitly non-live data. Inactive features are hidden or explain availability professionally instead of exposing configuration errors.
