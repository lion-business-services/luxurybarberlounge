# Owner Setup

1. Set `INITIAL_OWNER_EMAIL=info@theluxurybarberlounge.com` in Vercel Production, Preview, and Development.
2. Keep `NEXT_PUBLIC_PORTAL_DEMO_MODE=false`.
3. Verify the email through the six-digit Supabase OTP flow.
4. The server resolves the verified Supabase user ID and assigns the business-scoped owner role.
5. Confirm `user_roles` contains owner for the Luxury Barber Lounge business.
6. Confirm `/admin` opens and an ordinary client is rejected.
7. Review `auth_audit`, `sessions_metadata`, and `audit_logs` for the login and role assignment.

No other address is auto-promoted. Future barber, receptionist, or manager users must receive an owner-created invitation and complete OTP verification. Owner and super-admin are excluded from the invitation API.
