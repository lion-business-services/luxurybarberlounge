# Booking Data Model

The booking engine uses normalized references plus immutable snapshots.

## Core tables

- `clients`
- `barber_profiles`
- `barber_profile_services`
- `barber_schedules`
- `barber_breaks`
- `barber_time_off`
- `locations`
- `business_hours`
- `holiday_hours`
- `service_categories`
- `services`
- `service_addons`
- `appointments`
- `appointment_addons`
- `appointment_assignments`
- `appointment_status_history`
- `appointment_notes`
- `appointment_reference_images`
- `slot_holds`
- `queue_entries`
- `formsubmit_deliveries`
- `notification_jobs`
- `notification_deliveries`
- `booking_events`
- `audit_logs`
- `sync_failures`

## Historical integrity

Appointments store service, price, duration, add-on, barber, and client snapshots so later catalog edits do not rewrite appointment history. Provider IDs and internal IDs remain separate.

## Concurrency

`appointments_no_active_overlap` and `slot_holds_no_active_overlap` use PostgreSQL range exclusion constraints. `create_appointment_atomic` also uses an advisory transaction lock and an idempotency key. `reschedule_appointment_atomic` applies the same database-level conflict protection.
