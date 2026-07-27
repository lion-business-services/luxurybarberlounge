# Luxury Barber Lounge

A bilingual (EN/ES) marketing site for Luxury Barber Lounge — an invitation-grade barbershop.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) · React 19 · TypeScript
- Tailwind CSS v4
- [Supabase JS](https://supabase.com) (client)
- [lucide-react](https://lucide.dev) for icons

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public API key |

`.env.local` is gitignored. Use `.env.local.example` as a template.

## Project layout

```
src/
  app/                       App Router routes
    layout.tsx               Root layout (fonts, providers, header, footer)
    page.tsx                 Home / hero
    services|barbers|membership|visit|about/
                             Route stubs (Coming Soon)
    globals.css              Brand tokens + Tailwind v4 theme
  components/
    Header.tsx               Sticky header + mobile menu
    Footer.tsx               NAP, hours, socials
    Logo.tsx                 Brand mark
    LanguageToggle.tsx       EN/ES toggle
    StubPage.tsx             Shared "Coming Soon" stub
    SocialIcons.tsx          Brand-icon SVGs (lucide v1 dropped brand marks)
  lib/
    supabase.ts              Supabase client
    i18n/
      dict.ts                EN/ES copy
      context.tsx            LangProvider + useLang() hook
```

## Brand

- **Ink** `#0A0A0A` · **Brass** `#B8862A` · **Oxblood** `#722F37` · **Bone** `#EFE7D8`
- Display: **Playfair Display** · Body: **Inter** — both via `next/font`

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm run lint` | ESLint |
