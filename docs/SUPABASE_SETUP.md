# Supabase Setup

1. Add public URL/publishable key and server-only service-role key to local and Vercel environments.
2. Link the CLI to the correct project.
3. Run `npx supabase@latest migration list`.
4. Run `npx supabase@latest db push`.
5. Confirm local and remote migrations match through `202608060017`.
6. Generate database types with `npm run types:supabase` while authenticated.
7. Confirm RLS and operational role assignments.
8. Redeploy Vercel after environment changes.

The service-role key is backend-only. Public access uses the publishable key with RLS.
