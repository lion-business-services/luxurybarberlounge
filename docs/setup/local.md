# Local Setup

```bash
nvm use
cp .env.example .env.local
npm ci
npm run dev
```

Do not copy `node_modules` between Windows, macOS, and Linux. Next.js installs an operating-system-specific compiler package during a clean install.

For a credential-free review, leave provider values blank. The public site remains functional, booking and availability are explicitly non-live, and staff portal demos require `NEXT_PUBLIC_PORTAL_DEMO_MODE=true`.

Before committing:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:content
npm test
npm run test:integration
npm run build
```
