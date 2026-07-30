# Authentication Code-Only Flow and Brand Icons

## Supabase dashboard setting required

The application requests access with `supabase.auth.signInWithOtp()` and verifies with `verifyOtp({ type: "email" })`. For new and returning users to receive only the six-digit access code:

- Authentication → Sign In / Providers → Email
- Allow new users to sign up: ON
- Confirm Email: OFF
- Authentication → Email Templates → Magic Link or OTP
- Include `{{ .Token }}`
- Remove `{{ .ConfirmationURL }}`

The OTP is the email-ownership verification step. Do not use the separate Confirm Signup link flow for this passwordless portal.

## Icon asset coverage

The approved uploaded logo is now used for:

- `src/app/favicon.ico`
- `src/app/icon.png`
- `src/app/apple-icon.png`
- `/favicon.ico`
- 16, 32, and 48 pixel browser/search icons
- 180 pixel Apple touch icon
- 192 and 512 pixel PWA/Android icons
- manifest metadata and structured-data logo reference

Browser tabs and search engines may retain a cached favicon after deployment. A hard refresh can update the browser immediately; search-engine recrawling is controlled by the search engine.
