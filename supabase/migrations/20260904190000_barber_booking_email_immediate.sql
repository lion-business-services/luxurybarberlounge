-- Ensure assigned barbers receive an immediate transactional email when a
-- website appointment is created. This is intentionally independent of the
-- client prepayment confirmation gate: the barber should know the appointment
-- was made even while the client's payment is still pending.
--
-- The notification job uses the same idempotency key as the application-layer
-- booking notification code, so later payment reconciliation cannot create a
-- duplicate barber email.

begin;

create or replace function public.queue_barber_booking_email_on_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  barber_email text;
  formatted_visit text;
begin
  if coalesce(new.booking_source, 'website') <> 'website' then
    return new;
  end if;

  select coalesce(
           nullif(btrim(u.email::text), ''),
           nullif(btrim(bp.portal_email::text), '')
         )
    into barber_email
  from public.barber_profiles bp
  left join auth.users u on u.id = new.assigned_staff_user_id
  where bp.id = new.barber_profile_id;

  if barber_email is null then
    return new;
  end if;

  formatted_visit := to_char(
    new.starts_at at time zone coalesce(nullif(new.timezone, ''), 'America/New_York'),
    'FMDay, FMMonth FMDD, YYYY "at" FMHH12:MI AM'
  );

  insert into public.notification_jobs (
    business_id,
    user_id,
    channel,
    template_key,
    locale,
    recipient,
    payload,
    idempotency_key,
    scheduled_for,
    status
  )
  values (
    new.business_id,
    new.assigned_staff_user_id,
    'email',
    'barber_booking_assigned',
    'en',
    barber_email,
    jsonb_build_object(
      'subject', 'New appointment: ' || new.service_name_snapshot,
      'body', new.client_name_snapshot || ' is scheduled for ' || formatted_visit || '. Reference ' || new.public_reference || '.',
      'transactional', true,
      'appointmentId', new.id,
      'appointmentField', 'barber_notification_status'
    ),
    'barber-booking-assigned:' || new.id::text,
    timezone('utc', now()),
    'queued'
  )
  on conflict (channel, idempotency_key) do nothing;

  if new.barber_notification_status = 'suppressed' then
    update public.appointments
       set barber_notification_status = 'queued'
     where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.queue_barber_booking_email_on_appointment()
  from public, anon, authenticated;

drop trigger if exists trg_queue_barber_booking_email_on_appointment
  on public.appointments;

create trigger trg_queue_barber_booking_email_on_appointment
after insert on public.appointments
for each row execute function public.queue_barber_booking_email_on_appointment();

commit;
