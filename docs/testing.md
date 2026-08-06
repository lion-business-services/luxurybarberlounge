# Testing

## Automated release gates

The repository includes deterministic checks for content, architecture, migrations, internal routes, secrets, permissions, core business rules, and integration scaffolding.

Run all source-level checks:

```bash
npm run check:source
```

That command runs:

- format guard
- ESLint
- strict TypeScript
- bilingual content validation
- migration ordering and safety validation
- internal route validation
- repository completeness validation
- high-confidence secret scan
- unit tests
- repository integration tests

Run the complete release gate, including the Next.js production build, in a clean operating-system-specific dependency installation:

```bash
rm -rf node_modules .next
npm ci
npm run check
```

## Current unit coverage

- Attribution precedence, owner overrides, referrals, walk-ins, and shop defaults
- Marketing consent, suppression, and quiet hours
- Explicit non-live development booking provider behavior
- Shop-versus-barber commission splits
- Refunds, discounts, tips, and non-negative outcomes
- Canonical business content and slug uniqueness
- Placeholder-barber prevention
- Client, reception, and owner permission boundaries
- Queue estimates and invalid-input handling

## Current integration coverage

- Primary public and portal route presence
- Ordered Supabase migration-set presence
- Empty environment-template credential values

Provider activation should add provisioned tests for Square signature failures, duplicate and out-of-order webhooks, refunds, missing mappings, Supabase role access, storage access, email/SMS failures, expired sessions, and upload rejection.

Browser E2E coverage should exercise visitor booking, client login/rebook, barber schedule, reception walk-in, admin content edit, rule edit, dispute, and owner resolution in a provisioned preview environment.
