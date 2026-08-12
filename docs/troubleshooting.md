# Troubleshooting

Use this checklist when a production feature is unavailable after deployment. It is intended for operators and developers and does not change public-site behavior.

## Authentication and portals

Confirm the Supabase URL, public key, and service-role key are configured in the deployment environment. Apply every migration in timestamp order. Barber access is passwordless and depends on the verified login email matching a pending invitation or a linked barber profile. Never place the service-role key in browser code.

## Appointments and availability

Verify the Northfield location, active services, barber schedules, service eligibility, and business hours exist in Supabase. If availability is empty, check that the selected barber is active, bookable for the service, and not blocked by time off or an overlapping appointment.

## Queue and shop TV

The television display reads the protected operational queue plus today's live appointments through the public privacy-safe display route. If the board is empty, verify the latest queue migration is applied and that appointments or queue entries have an active status. Client phone and email must never be returned by the display route.

## Square

Confirm the Square access token, location ID, webhook signature key, and application environment are set only in server-side deployment variables. Use the admin service synchronization action to match active bookable services to Square appointment-service variations. Ambiguous or unmatched services require owner review instead of guessing an identifier.

## Commissions

Run the protected commission cron after Square synchronization. Commission calculations require a completed non-deposit Square payment, a resolvable appointment or verified legacy booking, and an assigned barber. Monday statement delivery is idempotent and uses the prior Monday-through-Sunday settlement period.

## Deployment checks

Run `npm run check:source` and `npm run build` before release. Do not package `.env.local`, `.next`, `node_modules`, coverage output, Supabase temporary files, or TypeScript build-info files.
