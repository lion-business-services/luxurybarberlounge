-- Luxury Barber Lounge: row-level security, role helpers, storage buckets, and storage policies.
begin;

create or replace function public.can_admin_business(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key in ('owner','super_admin')
      and (r.key = 'super_admin'::public.app_role or ur.business_id = target_business)
  );
$$;

create or replace function public.has_permission(permission_key text, target_business uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and p.key = permission_key
      and (r.key = 'super_admin'::public.app_role or target_business is null or ur.business_id = target_business)
  );
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'businesses','locations','profiles','roles','permissions','user_roles','role_permissions','staff_profiles','client_profiles',
    'notification_preferences','consent_records','auth_audit','business_hours','holiday_hours','location_settings',
    'service_categories','services','service_addons','staff_services','service_locations','pricing_rules',
    'square_locations','square_team_members','square_catalog_objects','square_customers','square_bookings','square_orders','square_payments','square_refunds','square_sync_state',
    'booking_metadata','booking_attributions','appointment_notes','appointment_reference_images','appointment_status_history',
    'walkin_sessions','queue_entries','queue_assignments','queue_status_history',
    'pages','page_sections','media_assets','barber_profiles','portfolio_items','testimonials','faqs','blog_posts','promotions','navigation_items',
    'membership_plans','memberships','membership_usage','membership_events','referrals','rewards_ledger','feedback','reviews',
    'attribution_rules','attribution_rule_versions','commission_rules','commission_rule_versions','settlement_periods','reconciliation_runs','commission_calculations','commission_adjustments','commission_disputes','dispute_events','settlement_statements','reconciliation_exceptions',
    'leads','lead_events','support_cases','support_case_events','career_applications','event_inquiries','message_templates','automation_rules','automation_runs','notification_jobs','notification_deliveries','campaigns','campaign_events','integrations','webhook_events','webhook_attempts','sync_failures','feature_flags','system_settings','scheduled_jobs','audit_logs'
  ] LOOP
    EXECUTE format('alter table public.%I enable row level security', table_name);
  END LOOP;
END $$;

-- Public, published business content.
drop policy if exists businesses_public_read on public.businesses;
create policy businesses_public_read on public.businesses for select using (status = 'active');
drop policy if exists locations_public_read on public.locations;
create policy locations_public_read on public.locations for select using (active);
drop policy if exists hours_public_read on public.business_hours;
create policy hours_public_read on public.business_hours for select using (exists (select 1 from public.locations l where l.id = location_id and l.active));
drop policy if exists holiday_hours_public_read on public.holiday_hours;
create policy holiday_hours_public_read on public.holiday_hours for select using (exists (select 1 from public.locations l where l.id = location_id and l.active));
drop policy if exists service_categories_public_read on public.service_categories;
create policy service_categories_public_read on public.service_categories for select using (active);
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services for select using (active and content_status = 'published');
drop policy if exists service_addons_public_read on public.service_addons;
create policy service_addons_public_read on public.service_addons for select using (active);
drop policy if exists service_locations_public_read on public.service_locations;
create policy service_locations_public_read on public.service_locations for select using (active);
drop policy if exists barber_profiles_public_read on public.barber_profiles;
create policy barber_profiles_public_read on public.barber_profiles for select using (active and status = 'published');
drop policy if exists portfolio_public_read on public.portfolio_items;
create policy portfolio_public_read on public.portfolio_items for select using (status = 'published');
drop policy if exists media_public_read on public.media_assets;
create policy media_public_read on public.media_assets for select using (privacy = 'public' and moderation_status = 'approved');
drop policy if exists pages_public_read on public.pages;
create policy pages_public_read on public.pages for select using (status = 'published' and (published_at is null or published_at <= timezone('utc', now())));
drop policy if exists page_sections_public_read on public.page_sections;
create policy page_sections_public_read on public.page_sections for select using (status = 'published' and exists (select 1 from public.pages p where p.id = page_id and p.status = 'published'));
drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read on public.testimonials for select using (status = 'published' and verified and permission_to_publish);
drop policy if exists faqs_public_read on public.faqs;
create policy faqs_public_read on public.faqs for select using (status = 'published');
drop policy if exists blog_posts_public_read on public.blog_posts;
create policy blog_posts_public_read on public.blog_posts for select using (status = 'published' and (published_at is null or published_at <= timezone('utc', now())));
drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions for select using (status = 'published' and (starts_at is null or starts_at <= timezone('utc', now())) and (ends_at is null or ends_at >= timezone('utc', now())));
drop policy if exists navigation_public_read on public.navigation_items;
create policy navigation_public_read on public.navigation_items for select using (active);
drop policy if exists membership_plans_public_read on public.membership_plans;
create policy membership_plans_public_read on public.membership_plans for select using (active and status = 'published');
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select using (status = 'published' and verified);

-- Self-service identity, preferences, and consent.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles for select using (user_id = auth.uid());
drop policy if exists notification_preferences_self_all on public.notification_preferences;
create policy notification_preferences_self_all on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists client_profiles_self_all on public.client_profiles;
create policy client_profiles_self_all on public.client_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists consent_self_read on public.consent_records;
create policy consent_self_read on public.consent_records for select using (user_id = auth.uid());
drop policy if exists consent_self_insert on public.consent_records;
create policy consent_self_insert on public.consent_records for insert with check (user_id = auth.uid() or user_id is null);

-- Client-owned booking, membership, queue, feedback, rewards, and support records.
drop policy if exists booking_metadata_client_read on public.booking_metadata;
create policy booking_metadata_client_read on public.booking_metadata for select using (client_user_id = auth.uid());
drop policy if exists appointment_notes_client_read on public.appointment_notes;
create policy appointment_notes_client_read on public.appointment_notes for select using (client_visible and exists (select 1 from public.booking_metadata b where b.id = booking_metadata_id and b.client_user_id = auth.uid()));
drop policy if exists reference_images_client_all on public.appointment_reference_images;
create policy reference_images_client_all on public.appointment_reference_images for all using (exists (select 1 from public.booking_metadata b where b.id = booking_metadata_id and b.client_user_id = auth.uid())) with check (uploaded_by = auth.uid() and exists (select 1 from public.booking_metadata b where b.id = booking_metadata_id and b.client_user_id = auth.uid()));
drop policy if exists queue_client_read on public.queue_entries;
create policy queue_client_read on public.queue_entries for select using (client_id = auth.uid());
drop policy if exists memberships_client_read on public.memberships;
create policy memberships_client_read on public.memberships for select using (client_user_id = auth.uid());
drop policy if exists membership_usage_client_read on public.membership_usage;
create policy membership_usage_client_read on public.membership_usage for select using (exists (select 1 from public.memberships m where m.id = membership_id and m.client_user_id = auth.uid()));
drop policy if exists membership_events_client_read on public.membership_events;
create policy membership_events_client_read on public.membership_events for select using (exists (select 1 from public.memberships m where m.id = membership_id and m.client_user_id = auth.uid()));
drop policy if exists referrals_client_read on public.referrals;
create policy referrals_client_read on public.referrals for select using (referring_client_id = auth.uid() or referred_client_id = auth.uid());
drop policy if exists rewards_client_read on public.rewards_ledger;
create policy rewards_client_read on public.rewards_ledger for select using (client_user_id = auth.uid());
drop policy if exists feedback_client_insert on public.feedback;
create policy feedback_client_insert on public.feedback for insert with check (client_user_id = auth.uid());
drop policy if exists feedback_client_read on public.feedback;
create policy feedback_client_read on public.feedback for select using (client_user_id = auth.uid());
drop policy if exists support_client_read on public.support_cases;
create policy support_client_read on public.support_cases for select using (client_user_id = auth.uid());
drop policy if exists support_case_events_client_read on public.support_case_events;
create policy support_case_events_client_read on public.support_case_events for select using (client_visible and exists (select 1 from public.support_cases c where c.id = case_id and c.client_user_id = auth.uid()));

-- Barber-owned operational and financial records.
drop policy if exists staff_profile_self_read on public.staff_profiles;
create policy staff_profile_self_read on public.staff_profiles for select using (user_id = auth.uid() or public.can_operate_business(business_id));
drop policy if exists staff_profile_self_update on public.staff_profiles;
create policy staff_profile_self_update on public.staff_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists booking_metadata_barber_read on public.booking_metadata;
create policy booking_metadata_barber_read on public.booking_metadata for select using (barber_user_id = auth.uid() or public.can_operate_business(business_id));
drop policy if exists commission_barber_read on public.commission_calculations;
create policy commission_barber_read on public.commission_calculations for select using (barber_user_id = auth.uid() or public.can_manage_business(business_id));
drop policy if exists statements_barber_read on public.settlement_statements;
create policy statements_barber_read on public.settlement_statements for select using (barber_user_id = auth.uid() or public.can_manage_business(business_id));
drop policy if exists disputes_barber_read on public.commission_disputes;
create policy disputes_barber_read on public.commission_disputes for select using (barber_user_id = auth.uid() or public.can_manage_business(business_id));
drop policy if exists disputes_barber_insert on public.commission_disputes;
create policy disputes_barber_insert on public.commission_disputes for insert with check (barber_user_id = auth.uid());
drop policy if exists dispute_events_barber_read on public.dispute_events;
create policy dispute_events_barber_read on public.dispute_events for select using (barber_visible and exists (select 1 from public.commission_disputes d where d.id = dispute_id and (d.barber_user_id = auth.uid() or public.can_manage_business(d.business_id))));

-- Business staff operational access.
drop policy if exists queue_staff_all on public.queue_entries;
create policy queue_staff_all on public.queue_entries for all using (public.can_operate_business(business_id)) with check (public.can_operate_business(business_id));
drop policy if exists walkin_sessions_staff_all on public.walkin_sessions;
create policy walkin_sessions_staff_all on public.walkin_sessions for all using (public.can_operate_business(business_id)) with check (public.can_operate_business(business_id));
drop policy if exists square_bookings_staff_read on public.square_bookings;
create policy square_bookings_staff_read on public.square_bookings for select using (public.can_operate_business(business_id));
drop policy if exists client_profiles_staff_read on public.client_profiles;
create policy client_profiles_staff_read on public.client_profiles for select using (business_id is not null and public.can_operate_business(business_id));
drop policy if exists leads_staff_all on public.leads;
create policy leads_staff_all on public.leads for all using (business_id is not null and public.can_operate_business(business_id)) with check (business_id is not null and public.can_operate_business(business_id));
drop policy if exists support_staff_all on public.support_cases;
create policy support_staff_all on public.support_cases for all using (public.can_operate_business(business_id)) with check (public.can_operate_business(business_id));

-- Manager/owner content and configuration access.
drop policy if exists services_manage on public.services;
create policy services_manage on public.services for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
drop policy if exists categories_manage on public.service_categories;
create policy categories_manage on public.service_categories for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
drop policy if exists addons_manage on public.service_addons;
create policy addons_manage on public.service_addons for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
drop policy if exists pages_manage on public.pages;
create policy pages_manage on public.pages for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
drop policy if exists media_manage on public.media_assets;
create policy media_manage on public.media_assets for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
drop policy if exists barber_profiles_manage on public.barber_profiles;
create policy barber_profiles_manage on public.barber_profiles for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
drop policy if exists membership_plans_manage on public.membership_plans;
create policy membership_plans_manage on public.membership_plans for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
drop policy if exists promotions_manage on public.promotions;
create policy promotions_manage on public.promotions for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
drop policy if exists campaigns_manage on public.campaigns;
create policy campaigns_manage on public.campaigns for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
drop policy if exists automation_rules_manage on public.automation_rules;
create policy automation_rules_manage on public.automation_rules for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

-- Owner-only financial, integration, role, settings, and audit records.
drop policy if exists commission_rules_admin on public.commission_rules;
create policy commission_rules_admin on public.commission_rules for all using (public.can_admin_business(business_id)) with check (public.can_admin_business(business_id));
drop policy if exists attribution_rules_admin on public.attribution_rules;
create policy attribution_rules_admin on public.attribution_rules for all using (public.can_admin_business(business_id)) with check (public.can_admin_business(business_id));
drop policy if exists settlement_admin on public.settlement_periods;
create policy settlement_admin on public.settlement_periods for all using (public.can_admin_business(business_id)) with check (public.can_admin_business(business_id));
drop policy if exists calculations_admin_write on public.commission_calculations;
create policy calculations_admin_write on public.commission_calculations for all using (public.can_admin_business(business_id)) with check (public.can_admin_business(business_id));
drop policy if exists integrations_admin on public.integrations;
create policy integrations_admin on public.integrations for all using (public.can_admin_business(business_id)) with check (public.can_admin_business(business_id));
drop policy if exists webhooks_admin_read on public.webhook_events;
create policy webhooks_admin_read on public.webhook_events for select using (business_id is not null and public.can_admin_business(business_id));
drop policy if exists feature_flags_admin on public.feature_flags;
create policy feature_flags_admin on public.feature_flags for all using (business_id is null or public.can_admin_business(business_id)) with check (business_id is null or public.can_admin_business(business_id));
drop policy if exists system_settings_admin on public.system_settings;
create policy system_settings_admin on public.system_settings for all using (business_id is null or public.can_admin_business(business_id)) with check (business_id is null or public.can_admin_business(business_id));
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select using (business_id is not null and public.can_admin_business(business_id));
drop policy if exists user_roles_admin on public.user_roles;
create policy user_roles_admin on public.user_roles for all using (business_id is not null and public.can_admin_business(business_id)) with check (business_id is not null and public.can_admin_business(business_id));

-- Service-role-only tables intentionally have no anon/authenticated write policy:
-- Square mirrors, webhook attempts, notification deliveries, sync failures, auth audit, and scheduled jobs.

grant usage on schema public to anon, authenticated;
grant select on public.businesses, public.locations, public.business_hours, public.holiday_hours,
  public.service_categories, public.services, public.service_addons, public.service_locations,
  public.barber_profiles, public.portfolio_items, public.media_assets, public.pages, public.page_sections,
  public.testimonials, public.faqs, public.blog_posts, public.promotions, public.navigation_items,
  public.membership_plans, public.reviews to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media','public-media',true,15728640,array['image/jpeg','image/png','image/webp','image/avif','video/mp4']),
  ('client-references','client-references',false,10485760,array['image/jpeg','image/png','image/webp']),
  ('staff-portfolio','staff-portfolio',false,15728640,array['image/jpeg','image/png','image/webp','video/mp4']),
  ('dispute-evidence','dispute-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Supabase Storage enables RLS on storage.objects; policies below extend it safely.

drop policy if exists public_media_read on storage.objects;
create policy public_media_read on storage.objects for select using (bucket_id = 'public-media');
drop policy if exists client_reference_owner_read on storage.objects;
create policy client_reference_owner_read on storage.objects for select using (bucket_id = 'client-references' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists client_reference_owner_insert on storage.objects;
create policy client_reference_owner_insert on storage.objects for insert with check (bucket_id = 'client-references' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists client_reference_owner_delete on storage.objects;
create policy client_reference_owner_delete on storage.objects for delete using (bucket_id = 'client-references' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists staff_portfolio_owner_all on storage.objects;
create policy staff_portfolio_owner_all on storage.objects for all using (bucket_id = 'staff-portfolio' and ((storage.foldername(name))[1] = auth.uid()::text or auth.role() = 'service_role')) with check (bucket_id = 'staff-portfolio' and ((storage.foldername(name))[1] = auth.uid()::text or auth.role() = 'service_role'));
drop policy if exists dispute_evidence_owner_all on storage.objects;
create policy dispute_evidence_owner_all on storage.objects for all using (bucket_id = 'dispute-evidence' and ((storage.foldername(name))[1] = auth.uid()::text or auth.role() = 'service_role')) with check (bucket_id = 'dispute-evidence' and ((storage.foldername(name))[1] = auth.uid()::text or auth.role() = 'service_role'));

commit;
