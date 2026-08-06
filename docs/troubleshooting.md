# Troubleshooting

## Booking route unavailable

Check Supabase environment values, migrations, at least one live non-demo barber, service eligibility, and active schedules.

## No time slots

Check business/holiday hours, barber schedule, breaks, time off, service duration, buffer, lead time, existing appointments, and holds.

## Slot taken

This is expected race protection. Refresh availability and choose an alternative.

## Appointment saved but no email

Open `/admin/appointments`. Inspect FormSubmit and notification state. The appointment remains valid; use retry and inspect cron logs.

## Client cannot see guest booking

Verify OTP email exactly matches the booking email and inspect `clients.auth_user_id` and `appointments.auth_user_id`. Never merge by name.

## Vercel Node warning

Use Node 22.x in both Vercel and `package.json`, keep the root directory correct, install optional dependencies, and redeploy without cache.

## Square not active

Keep Square flags false. Supabase booking remains operational. Configure Square only after production permissions and mappings are verified.
