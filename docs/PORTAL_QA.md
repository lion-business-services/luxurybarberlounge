# Portal QA

## Visual separation

The client and admin portals use separate route layouts, navigation models, CSS modules, dashboard components, data loaders, terminology, empty states, and permissions. Public cinematic code is excluded from authenticated routes.

## Viewport matrix

Source layouts are designed for 320, 360, 375, 390, 430, 768, 820, 1024, 1280, 1366, 1440, and 1920 pixels. Before production promotion, capture browser screenshots for login email/OTP, client dashboard and core modules, and admin dashboard/client/order/membership/queue/barber/integration/audit modules.

## Required browser checks

- No page-wide horizontal overflow.
- Client navigation remains thumb-accessible and concise.
- Admin tables become controlled horizontal regions or mobile summaries.
- Focus is visible; dialogs retain focus; actions do not depend on hover.
- Loading, empty, error, unauthorized, session-expired, offline, and provider-unavailable states render text rather than blank screens.
- Client never receives other-client records in HTML or RSC payloads.

Automated browser screenshots require a successful dependency installation and production/dev server. If the package registry blocks installation, do not claim visual browser QA passed.
