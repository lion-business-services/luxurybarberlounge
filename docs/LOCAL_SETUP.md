# Local Setup

## Requirements

- Node.js 22 recommended (`.nvmrc`)
- npm 10+
- A clean dependency install for the current operating system
- Optional: Supabase CLI for local database and migration testing

## Start

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`.

The public experience works without provider credentials. Credential-dependent features return explicit unavailable or development states rather than pretending to be live.

## Full validation

```bash
npm run check:source
npm run build
```

For a local Supabase stack:

```bash
supabase start
supabase db reset
```

Then place the local project URL, anonymous key, and server-only service-role key in `.env.local`.

## Never do this

- Do not copy `node_modules` from Windows to Linux or macOS.
- Do not commit `.env.local`.
- Do not put the Supabase service-role key, Square access token, Resend API key, or webhook secrets in any `NEXT_PUBLIC_` variable.
