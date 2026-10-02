-- Local test harness ONLY. Seed data shaped like production, with fixed ids.
-- Includes "legacy" rows that the migration's backfill must handle.

insert into public.businesses (id, name, slug) values ('00000000-0000-0000-0000-0000000000b1', 'Luxury Barber Lounge', 'luxury-barber-lounge');

insert into public.locations (id, business_id, name, slug, address_line_1, city, region, postal_code, timezone) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'Northfield Lounge', 'northfield', '801 Tilton Rd', 'Northfield', 'NJ', '08225', 'America/New_York');

-- Production had default_buffer_minutes = 0 before the migration.
insert into public.location_settings (location_id, default_buffer_minutes) values ('00000000-0000-0000-0000-0000000000a1', 0);

insert into public.business_hours (location_id, weekday, opens_at, closes_at, closed) values
  ('00000000-0000-0000-0000-0000000000a1', 0, '09:00', '16:00', false),
  ('00000000-0000-0000-0000-0000000000a1', 1, null, null, true),
  ('00000000-0000-0000-0000-0000000000a1', 2, '08:00', '21:00', false),
  ('00000000-0000-0000-0000-0000000000a1', 3, '08:00', '21:00', false),
  ('00000000-0000-0000-0000-0000000000a1', 4, '08:00', '21:00', false),
  ('00000000-0000-0000-0000-0000000000a1', 5, '08:00', '21:00', false),
  ('00000000-0000-0000-0000-0000000000a1', 6, '08:00', '21:00', false);

insert into public.services (id, business_id, slug, name, price_cents, duration_minutes, deposit_cents, content_status, sort_order) values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000b1', 'haircut', '{"en":"Haircut","es":"Corte"}', 5000, 60, 5000, 'published', 0),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-0000000000b1', 'kids-haircut', '{"en":"Kids Haircut","es":"Corte para Ninos"}', 3500, 40, 3500, 'published', 5),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-0000000000b1', 'senior-haircut', '{"en":"Senior Haircut","es":"Corte para Adulto Mayor"}', 4000, 35, 4000, 'published', 6),
  ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-0000000000b1', 'beard', '{"en":"Beard","es":"Barba"}', 1500, 25, 1500, 'published', 2),
  ('00000000-0000-0000-0000-000000000505', '00000000-0000-0000-0000-0000000000b1', 'design', '{"en":"Design","es":"Diseno"}', 15000, 60, 15000, 'published', 8);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'ruben@example.test');

insert into public.barber_profiles (id, business_id, staff_user_id, slug, display_name, active, demo, status, sort_order, portal_email) values
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e1', 'ruben-diaz-jr', 'Rubén Diaz, Jr.', true, false, 'published', 0, 'ruben@example.test'),
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-0000000000b1', null, 'hommy-rivera', 'Hommy Rivera', true, false, 'published', 2, null),
  ('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-0000000000b1', null, 'barber-los', 'Barber Lo''s', true, false, 'published', 3, null);

-- Ruben and Hommy offer the standard menu, including Kids Haircut and Beard. Barber Lo's offers Design and Haircut but not Kids Haircut.
insert into public.barber_profile_services (barber_profile_id, service_id) values
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501'),
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000502'),
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000503'),
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504'),
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000501'),
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000502'),
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000503'),
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000504'),
  ('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-000000000501'),
  ('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-000000000505');

-- Ruben: Tuesday-Friday 08:00-21:00. Hommy: Sunday 09:00-16:00 and Tuesday-Saturday 08:00-21:00. Lo's: Friday/Saturday evenings.
insert into public.barber_schedules (barber_profile_id, location_id, weekday, starts_at, ends_at, effective_from)
select '00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', d, '08:00', '21:00', date '2026-08-27' from generate_series(2, 5) d;
insert into public.barber_schedules (barber_profile_id, location_id, weekday, starts_at, ends_at, effective_from)
select '00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-0000000000a1', d, '08:00', '21:00', date '2026-08-07' from generate_series(2, 6) d;
insert into public.barber_schedules (barber_profile_id, location_id, weekday, starts_at, ends_at, effective_from) values
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-0000000000a1', 0, '09:00', '16:00', date '2026-08-07'),
  ('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-0000000000a1', 5, '18:00', '21:00', date '2026-09-03'),
  ('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-0000000000a1', 6, '18:00', '21:00', date '2026-09-03');

insert into public.clients (id, business_id, first_name, last_name, email, phone) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Test', 'Client', 'client@example.test', '+16095550100');

-- Legacy rows present before the migration (inserted with triggers bypassed, as history).
set session_replication_role = replica;

insert into public.appointments (id, business_id, location_id, client_id, service_id, barber_profile_id, public_reference, manage_token_hash, service_name_snapshot, service_price_snapshot_cents, service_duration_snapshot_minutes, barber_name_snapshot, client_name_snapshot, starts_at, ends_at, status, deposit_required_cents, deposit_status, policy_version, policy_accepted_at, idempotency_key, created_at) values
  -- two abandoned checkouts, back to back with a zero-minute gap, created days ago
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000c01', 'LEGACY-STALE-1', 'x', 'Haircut', 5000, 60, 'Rubén Diaz, Jr.', 'Test Client', timestamptz '2027-01-05 08:00 America/New_York', timestamptz '2027-01-05 09:00 America/New_York', 'pending_confirmation', 5000, 'pending', 'p', now(), gen_random_uuid(), now() - interval '3 days'),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000c01', 'LEGACY-STALE-2', 'x', 'Haircut', 5000, 60, 'Rubén Diaz, Jr.', 'Test Client', timestamptz '2027-01-05 09:00 America/New_York', timestamptz '2027-01-05 10:00 America/New_York', 'pending_confirmation', 5000, 'pending', 'p', now(), gen_random_uuid(), now() - interval '3 days'),
  -- an old hold whose payment link was paid but whose appointment was never promoted: must NOT be expired
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000c01', 'LEGACY-PAID-LINK', 'x', 'Haircut', 5000, 60, 'Rubén Diaz, Jr.', 'Test Client', timestamptz '2027-01-05 12:00 America/New_York', timestamptz '2027-01-05 13:00 America/New_York', 'pending_confirmation', 5000, 'pending', 'p', now(), gen_random_uuid(), now() - interval '2 days'),
  -- a checkout started one minute ago: still inside its hold window
  ('00000000-0000-0000-0000-00000000f004', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000c01', 'LEGACY-LIVE-HOLD', 'x', 'Haircut', 5000, 60, 'Rubén Diaz, Jr.', 'Test Client', timestamptz '2027-01-05 15:00 America/New_York', timestamptz '2027-01-05 16:00 America/New_York', 'pending_confirmation', 5000, 'pending', 'p', now(), gen_random_uuid(), now() - interval '1 minute'),
  -- a paid, confirmed appointment and a completed one with no recorded completion time
  ('00000000-0000-0000-0000-00000000f005', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000c01', 'LEGACY-CONFIRMED', 'x', 'Haircut', 5000, 60, 'Rubén Diaz, Jr.', 'Test Client', timestamptz '2027-01-05 17:00 America/New_York', timestamptz '2027-01-05 18:00 America/New_York', 'confirmed', 5000, 'paid', 'p', now(), gen_random_uuid(), now() - interval '5 days'),
  ('00000000-0000-0000-0000-00000000f006', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000c01', 'LEGACY-COMPLETED', 'x', 'Haircut', 5000, 60, 'Rubén Diaz, Jr.', 'Test Client', timestamptz '2026-09-29 12:00 America/New_York', timestamptz '2026-09-29 13:00 America/New_York', 'completed', 5000, 'paid', 'p', now(), gen_random_uuid(), now() - interval '9 days'),
  -- two paid appointments booked back to back while the gap was zero: both must survive the 5-minute rule
  ('00000000-0000-0000-0000-00000000f007', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000c02', 'LEGACY-ADJ-1', 'x', 'Haircut', 5000, 60, 'Hommy Rivera', 'Test Client', timestamptz '2027-01-06 10:00 America/New_York', timestamptz '2027-01-06 11:00 America/New_York', 'confirmed', 5000, 'paid', 'p', now(), gen_random_uuid(), now() - interval '4 days'),
  ('00000000-0000-0000-0000-00000000f008', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000c02', 'LEGACY-ADJ-2', 'x', 'Haircut', 5000, 60, 'Hommy Rivera', 'Test Client', timestamptz '2027-01-06 11:00 America/New_York', timestamptz '2027-01-06 12:00 America/New_York', 'confirmed', 5000, 'paid', 'p', now(), gen_random_uuid(), now() - interval '4 days');

insert into public.appointment_payment_links (business_id, appointment_id, purpose, amount_cents, square_payment_link_id, square_order_id, checkout_url, status) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000f001', 'deposit', 5000, 'pl-1', 'order-1', 'https://example.test/1', 'created'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000f003', 'deposit', 5000, 'pl-3', 'order-3', 'https://example.test/3', 'paid'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000f005', 'deposit', 5000, 'pl-5', 'order-5', 'https://example.test/5', 'paid');

set session_replication_role = origin;
