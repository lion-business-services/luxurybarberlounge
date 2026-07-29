# Testing

## Automated gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:content
npm run validate:migrations
npm run validate:routes
npm run validate:repository
npm run validate:performance
npm run scan:secrets
npm test
npm run test:integration
npm run build
```

Unit tests cover content, roles, adaptive motion, booking provider, queue estimates/Who’s Next, attribution, policy governance, automations, and commission arithmetic/treatment. Integration tests verify routes, migrations, environment safety, media packaging, homepage order, responsive assets, and protected hero regression.

## Manual matrix

Test 320, 360, 375, 390, 430, 768, 820, 1024, 1280, 1366, 1440, 1920, and ultrawide. Test first/cached visits, slow network, CPU throttling, reduced motion, touch, mouse, keyboard, forward/reverse scroll, orientation, zoom, history navigation, video autoplay/fallback, OTP states, every role, queue assignment/override, attribution, dispute, Statement, duplicate/out-of-order webhooks, provider failures, and missing optional credentials.

Do not claim Safari/iOS or a provider delivery test passed unless it actually ran on that platform/provider.
