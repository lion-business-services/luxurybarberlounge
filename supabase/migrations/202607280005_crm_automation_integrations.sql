-- Luxury Barber Lounge: CRM, support, communications, automation, integration, webhook, settings, and audit infrastructure.
begin;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  source text not null default 'website',
  campaign text,
  status text not null default 'new' check (status in ('new','contacted','qualified','booked','won','lost','archived')),
  stage text not null default 'inquiry',
  owner_user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email citext,
  phone text,
  preferred_language text not null default 'en' check (preferred_language in ('en','es')),
  service_interest text,
  payload jsonb not null default '{}'::jsonb,
  consent jsonb not null default '{}'::jsonb,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  booking_metadata_id uuid references public.booking_metadata(id) on delete set null,
  feedback_id uuid references public.feedback(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  case_number text not null,
  category text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','pending_client','pending_internal','resolved','closed')),
  subject text not null,
  description text,
  resolution text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  unique (business_id, case_number)
);

create table if not exists public.support_case_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.support_cases(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  client_visible boolean not null default false,
  event_type text not null,
  message text,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  role_title text not null,
  full_name text not null,
  email citext not null,
  phone text,
  license_information jsonb not null default '{}'::jsonb,
  availability jsonb not null default '{}'::jsonb,
  experience_summary text,
  social_links jsonb not null default '{}'::jsonb,
  portfolio_paths jsonb not null default '[]'::jsonb,
  consent boolean not null default false,
  status text not null default 'submitted' check (status in ('submitted','reviewing','interview','offer','hired','declined','withdrawn')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_inquiries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  event_type text not null,
  full_name text not null,
  email citext not null,
  phone text,
  event_date date,
  guest_count integer check (guest_count is null or guest_count > 0),
  location_request text,
  requested_services jsonb not null default '[]'::jsonb,
  notes text,
  status text not null default 'new' check (status in ('new','quoted','deposit_pending','confirmed','completed','declined','cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  key text not null,
  channel text not null check (channel in ('email','sms','in_app','push','whatsapp')),
  locale text not null default 'en' check (locale in ('en','es')),
  subject text,
  body text not null,
  transactional boolean not null default false,
  variables text[] not null default array[]::text[],
  status public.record_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, key, channel, locale)
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  key text not null,
  trigger_key text not null,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  delay_seconds integer not null default 0 check (delay_seconds >= 0),
  channels text[] not null default array[]::text[],
  quiet_hours jsonb not null default '{}'::jsonb,
  consent_requirements jsonb not null default '{}'::jsonb,
  test_mode boolean not null default true,
  active boolean not null default false,
  version integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, key, version)
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  rule_id uuid references public.automation_rules(id) on delete set null,
  trigger_key text not null,
  idempotency_key text not null,
  subject_type text,
  subject_id text,
  status text not null default 'queued' check (status in ('queued','running','completed','partially_completed','suppressed','failed','cancelled')),
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, idempotency_key)
);

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  automation_run_id uuid references public.automation_runs(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  channel text not null check (channel in ('email','sms','in_app','push','whatsapp')),
  template_key text,
  locale text not null default 'en' check (locale in ('en','es')),
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  scheduled_for timestamptz not null default timezone('utc', now()),
  status text not null default 'queued' check (status in ('queued','processing','delivered','suppressed','failed','cancelled')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 4,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (channel, idempotency_key)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.notification_jobs(id) on delete cascade,
  provider text not null,
  provider_message_id text,
  attempt integer not null,
  status text not null,
  sanitized_response jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  objective text,
  locale text check (locale is null or locale in ('en','es')),
  channels text[] not null default array[]::text[],
  audience_definition jsonb not null default '{}'::jsonb,
  schedule jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','review','scheduled','running','paused','completed','cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null,
  environment text not null default 'sandbox' check (environment in ('development','sandbox','production')),
  status text not null default 'disconnected' check (status in ('disconnected','awaiting_credentials','connecting','healthy','degraded','failed','disabled')),
  public_config jsonb not null default '{}'::jsonb,
  secret_reference text,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, provider, environment)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  signature_valid boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  sanitized_headers jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default timezone('utc', now()),
  processing_status text not null default 'received' check (processing_status in ('received','processing','processed','ignored','retrying','failed','dead_letter')),
  processed_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  unique (provider, provider_event_id)
);

create table if not exists public.webhook_attempts (
  id bigint generated always as identity primary key,
  webhook_event_id uuid not null references public.webhook_events(id) on delete cascade,
  attempt integer not null,
  status text not null,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  error_message text,
  result jsonb not null default '{}'::jsonb
);

create table if not exists public.sync_failures (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  provider text not null,
  resource_type text not null,
  resource_id text,
  error_code text,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','retrying','resolved','ignored','dead_letter')),
  next_retry_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  key text not null,
  enabled boolean not null default false,
  scope jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, key)
);

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'business' check (sensitivity in ('public','business','restricted','secret_reference')),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, key)
);

create table if not exists public.scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  key text not null,
  schedule text not null,
  handler text not null,
  active boolean not null default false,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_status text,
  next_run_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (business_id, key)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  business_id uuid references public.businesses(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  resource_type text not null,
  resource_id text,
  reason text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_leads_pipeline on public.leads (business_id, status, next_follow_up_at, created_at desc);
create index if not exists idx_support_cases_status on public.support_cases (business_id, status, priority, created_at desc);
create index if not exists idx_notification_jobs_due on public.notification_jobs (status, scheduled_for) where status in ('queued','failed');
create index if not exists idx_automation_runs_status on public.automation_runs (business_id, status, created_at desc);
create index if not exists idx_webhook_events_status on public.webhook_events (provider, processing_status, received_at desc);
create index if not exists idx_sync_failures_status on public.sync_failures (business_id, status, next_retry_at);
create index if not exists idx_audit_resource on public.audit_logs (business_id, resource_type, resource_id, created_at desc);

DO $$ BEGIN
  drop trigger if exists leads_updated_at on public.leads;
  create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
  drop trigger if exists support_cases_updated_at on public.support_cases;
  create trigger support_cases_updated_at before update on public.support_cases for each row execute function public.set_updated_at();
  drop trigger if exists career_applications_updated_at on public.career_applications;
  create trigger career_applications_updated_at before update on public.career_applications for each row execute function public.set_updated_at();
  drop trigger if exists event_inquiries_updated_at on public.event_inquiries;
  create trigger event_inquiries_updated_at before update on public.event_inquiries for each row execute function public.set_updated_at();
  drop trigger if exists message_templates_updated_at on public.message_templates;
  create trigger message_templates_updated_at before update on public.message_templates for each row execute function public.set_updated_at();
  drop trigger if exists automation_rules_updated_at on public.automation_rules;
  create trigger automation_rules_updated_at before update on public.automation_rules for each row execute function public.set_updated_at();
  drop trigger if exists notification_jobs_updated_at on public.notification_jobs;
  create trigger notification_jobs_updated_at before update on public.notification_jobs for each row execute function public.set_updated_at();
  drop trigger if exists campaigns_updated_at on public.campaigns;
  create trigger campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
  drop trigger if exists integrations_updated_at on public.integrations;
  create trigger integrations_updated_at before update on public.integrations for each row execute function public.set_updated_at();
  drop trigger if exists sync_failures_updated_at on public.sync_failures;
  create trigger sync_failures_updated_at before update on public.sync_failures for each row execute function public.set_updated_at();
  drop trigger if exists feature_flags_updated_at on public.feature_flags;
  create trigger feature_flags_updated_at before update on public.feature_flags for each row execute function public.set_updated_at();
  drop trigger if exists system_settings_updated_at on public.system_settings;
  create trigger system_settings_updated_at before update on public.system_settings for each row execute function public.set_updated_at();
END $$;

comment on table public.webhook_events is 'Sanitized, idempotent webhook inbox. Full secrets and raw authorization headers must never be stored.';
comment on table public.audit_logs is 'Append-only business audit history for protected operational, financial, role, and content changes.';

commit;
