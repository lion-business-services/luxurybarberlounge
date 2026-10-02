# Barber Appointments

## Scope

The barber portal exposes only appointments assigned to the authenticated barber's linked `staff_profiles.user_id` or `barber_profiles.id`. Ruben uses the same mechanism when operating as a barber, even though his authenticated account may also hold the owner role.

## Available information

A barber can view today's and upcoming assignments, service, date and time, client-visible preparation notes, check-in state, queue assignment, reschedule or cancellation updates, and daily schedule information.

## Restricted information

Barbers do not receive owner-only analytics, unrelated client records, private administrative notes, other barbers' statements, integration credentials, or business-wide confidential data. Ruben's owner capabilities are available only when the authenticated session is operating under an authorized owner role.

## Assignment notifications

Successful appointment creation queues a barber-assignment notification using an idempotency key. Retries do not create duplicate deliveries. A failed email provider does not delete or roll back the appointment.

## Barber timeline and Finish (October 2026)

Today and Calendar in the Barber Portal show the barber's own timeline, drawn from the same engine as the Admin Portal calendar and the public booking page.

- A barber sees only their own appointments. A checkout in progress is shown as a hold without client details.
- **Finish** is available for the barber's own confirmed, checked-in, assigned or in-service appointments. It records the actual end time and reopens unused time after the 5-minute gap. The server checks that the appointment belongs to the signed-in barber.
- Time marked unavailable under Profile and availability is removed from public booking immediately, and reopens immediately when it is removed.

API: `GET /api/barber/calendar`, `PATCH /api/barber/calendar` (`finish`).
