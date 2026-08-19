# Portal test account

`support@lbsprocess.com` is the designated test identity for all portals
(client, barber, reception, admin) during pre-launch verification.

## Environment

```
PORTAL_TEST_EMAIL=support@lbsprocess.com
SQUARE_SANDBOX_TEST_EMAILS=support@lbsprocess.com
```

Set `PORTAL_TEST_EMAIL` in Vercel alongside the existing four feature flags.

## Rules

- The test account is flagged non-public and must never appear in the barber
  directory, the booking flow, or the TV queue board.
- It is excluded from commission settlement. Test transactions must not enter
  a real barber's payout.
- Rotate or disable before handing the platform to the client for live use.

## Verification

```sql
-- Confirm the test identity is present and non-public
select portal_email, is_public, active
from public.barber_profiles
where portal_email = 'support@lbsprocess.com';

-- Confirm it is excluded from settlement
select count(*) from public.commission_calculations c
join public.barber_profiles b on b.staff_user_id = c.barber_user_id
where b.portal_email = 'support@lbsprocess.com';
-- expected: 0
```
