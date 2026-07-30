# RLS Testing

## Static validation

Run:

```bash
npm run validate:rls
npm run validate:migrations
```

The validator checks RLS coverage, self-scoped client policies, business-scoped staff policies, and owner-only governance domains.

## Database structural smoke test

After applying migrations to staging, run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/portal_rls.sql
```

The script fails if required portal tables lack RLS, client-facing domains lack policies, or role helper functions are missing.

## Runtime matrix

Test with separate authenticated users:

- Client A can read Client A data and receives zero rows for Client B.
- Client cannot select `audit_logs`, `integrations`, `user_roles`, or commission governance records.
- Barber sees own assignments/statements only.
- Reception sees appointment and queue operations, not owner governance.
- Manager sees business operations but not owner-only nested routes or integration secrets.
- Owner has business-scoped governance access.
- Self-role elevation inserts are rejected.

Use a staging project. Never test destructive privacy or role scenarios against production identities.
