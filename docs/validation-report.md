# Release Validation Report

**Release date:** July 28, 2026

**Target:** GitHub and Vercel source deployment

## Passed gates

```text
Format guard                         PASS
ESLint                               PASS
TypeScript strict check              PASS
Bilingual content validation         PASS
Migration safety/order validation    PASS
Internal route validation            PASS
Repository completeness validation  PASS
High-confidence secret scan          PASS
Unit tests                           21 PASS / 0 FAIL
Integration tests                    3 PASS / 0 FAIL
```

Repository validation counted:

- 145 page routes
- 236 source files
- 6 ordered transactional SQL migrations
- 31 services
- 2 clearly marked development barber profiles
- 3 membership concepts

## Production build note

The extracted project supplied for this build contained a Windows `node_modules` directory. Next.js therefore could not load a Linux SWC compiler binary in the isolated Linux validation container. Network access was unavailable for a clean package reinstall inside that container.

The delivery ZIP excludes `node_modules`, `.next`, local environment files, and TypeScript build artifacts. The deployment environment must install dependencies from `package-lock.json`:

```bash
rm -rf node_modules .next
npm ci
npm run check
```

Vercel should use the repository root, Node.js 22, `npm ci` or its standard lockfile install, and `npm run build`. Do not upload a copied local `node_modules` directory.

## Launch controls

Keep live Square, queue, kiosk, membership billing, gift-card purchasing, SMS, WhatsApp, advanced analytics, and payout-export flags disabled until the relevant credentials, mappings, policies, and owner approvals are complete.
