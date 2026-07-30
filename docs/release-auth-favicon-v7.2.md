# Authentication and favicon refinement v7.2

Completed changes:

- Removed the decorative mail icon from the email-entry field across login, registration, and recovery because all three modes share `AuthCard`.
- Preserved the six-digit `signInWithOtp` and `verifyOtp` application flow.
- Added explicit code-only Supabase dashboard instructions. Hosted Supabase must have **Confirm Email disabled** and the **Magic Link or OTP** template must use `{{ .Token }}` rather than `{{ .ConfirmationURL }}`.
- Replaced browser, Apple, PWA, Android, manifest, and structured-data icon references with the approved uploaded Luxury Barber Lounge logo.
- Added stable 16, 32, 48, 180, 192, and 512 pixel derivatives plus a multi-size `.ico`.
- Added repository tests for the OTP-only application path, icon-free email field, icon assets, and manifest coverage.

Validation completed:

- Format guard passed
- ESLint passed
- TypeScript strict check passed
- Content, migration, route, repository, Vercel, performance, and secret validations passed
- 36 unit tests passed
- 18 integration tests passed

The production build was attempted but the isolated package mirror returned HTTP 404 for `@next/swc-linux-x64-gnu@16.2.6`. This is an external compiler-package retrieval limitation, not a source or type-checking error.
