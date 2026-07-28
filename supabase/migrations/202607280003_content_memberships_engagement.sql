-- Luxury Barber Lounge: public content, media, memberships, referrals, rewards, reviews, and feedback.
begin;

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug text not null,
  locale text not null default 'en' check (locale in ('en','es')),
  title text not null,
  excerpt text,
  body jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  canonical_path text,
  status public.record_status not null default 'draft',
  published_at timestamptz,
  scheduled_for timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug, locale)
);

create table if not exists public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  section_key text not null,
  sort_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  status public.record_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (page_id, section_key)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  storage_bucket text not null default 'public-media',
  storage_path text not null,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  width integer,
  height integer,
  duration_seconds numeric,
  alt_text jsonb not null default '{}'::jsonb,
  caption jsonb not null default '{}'::jsonb,
  privacy text not null default 'public' check (privacy in ('public','private','staff')),
  moderation_status text not null default 'approved' check (moderation_status in ('pending','approved','rejected','archived')),
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, storage_bucket, storage_path)
);

create table if not exists public.barber_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_user_id uuid references public.staff_profiles(user_id) on delete set null,
  slug text not null,
  display_name text not null,
  professional_title jsonb not null default '{}'::jsonb,
  short_intro jsonb not null default '{}'::jsonb,
  biography jsonb not null default '{}'::jsonb,
  story jsonb not null default '{}'::jsonb,
  specialties jsonb not null default '[]'::jsonb,
  languages text[] not null default array['en']::text[],
  certifications jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  hero_media_id uuid references public.media_assets(id) on delete set null,
  square_team_member_id text,
  featured boolean not null default false,
  active boolean not null default true,
  demo boolean not null default true,
  status public.record_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_profile_id uuid references public.barber_profiles(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  item_type text not null default 'result' check (item_type in ('before','after','result','interior','event','video')),
  title jsonb not null default '{}'::jsonb,
  caption jsonb not null default '{}'::jsonb,
  tags text[] not null default array[]::text[],
  featured boolean not null default false,
  status public.record_status not null default 'draft',
  approved_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  barber_user_id uuid references public.staff_profiles(user_id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  author_display_name text,
  rating smallint check (rating between 1 and 5),
  quote jsonb not null default '{}'::jsonb,
  source text not null default 'private_feedback',
  verified boolean not null default false,
  permission_to_publish boolean not null default false,
  status public.record_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text not null default 'general',
  question jsonb not null default '{}'::jsonb,
  answer jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  status public.record_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug text not null,
  locale text not null default 'en' check (locale in ('en','es')),
  title text not null,
  excerpt text,
  body jsonb not null default '{}'::jsonb,
  category text,
  tags text[] not null default array[]::text[],
  author_user_id uuid references public.profiles(id) on delete set null,
  hero_media_id uuid references public.media_assets(id) on delete set null,
  seo_title text,
  seo_description text,
  status public.record_status not null default 'draft',
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug, locale)
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  name text not null,
  slug text not null,
  content jsonb not null default '{}'::jsonb,
  code text,
  starts_at timestamptz,
  ends_at timestamptz,
  eligibility jsonb not null default '{}'::jsonb,
  status public.record_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  placement text not null default 'header' check (placement in ('header','footer','portal','mobile')),
  locale text not null default 'en' check (locale in ('en','es')),
  label text not null,
  href text not null,
  parent_id uuid references public.navigation_items(id) on delete cascade,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  square_catalog_id text,
  slug text not null,
  name jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  price_cents integer not null default 0 check (price_cents >= 0),
  billing_interval text not null default 'month' check (billing_interval in ('week','month','quarter','year','one_time')),
  included_services jsonb not null default '[]'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  usage_rules jsonb not null default '{}'::jsonb,
  pause_rules jsonb not null default '{}'::jsonb,
  cancellation_rules jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  featured boolean not null default false,
  demo boolean not null default true,
  status public.record_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid not null references public.client_profiles(user_id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id) on delete restrict,
  square_subscription_id text,
  status text not null default 'pending' check (status in ('pending','trial','active','paused','past_due','cancel_requested','cancelled','expired')),
  starts_at timestamptz,
  renews_at timestamptz,
  paused_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.membership_usage (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  booking_metadata_id uuid references public.booking_metadata(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  usage_type text not null default 'service',
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.membership_events (
  id bigint generated always as identity primary key,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  previous_status text,
  next_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  referring_client_id uuid references public.client_profiles(user_id) on delete set null,
  referring_barber_id uuid references public.staff_profiles(user_id) on delete set null,
  referred_client_id uuid references public.client_profiles(user_id) on delete set null,
  code text not null,
  status text not null default 'created' check (status in ('created','shared','captured','qualified','rewarded','rejected','expired')),
  source text,
  reward_cents integer not null default 0 check (reward_cents >= 0),
  fraud_flags jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  unique (business_id, code)
);

create table if not exists public.rewards_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid not null references public.client_profiles(user_id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  entry_type text not null check (entry_type in ('earn','redeem','expire','adjustment')),
  points integer not null,
  description text,
  balance_after integer,
  actor_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  booking_metadata_id uuid references public.booking_metadata(id) on delete set null,
  barber_user_id uuid references public.staff_profiles(user_id) on delete set null,
  score smallint check (score between 1 and 5),
  comments text,
  language text not null default 'en' check (language in ('en','es')),
  status text not null default 'new' check (status in ('new','reviewing','resolved','archived')),
  requires_follow_up boolean not null default false,
  consent_to_publish boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  feedback_id uuid references public.feedback(id) on delete set null,
  source text not null,
  external_id text,
  author_display_name text,
  rating smallint check (rating between 1 and 5),
  review_text text,
  verified boolean not null default false,
  public_url text,
  response_text text,
  published_at timestamptz,
  status public.record_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, source, external_id)
);

create index if not exists idx_pages_publish on public.pages (business_id, status, locale, published_at desc);
create index if not exists idx_media_business_privacy on public.media_assets (business_id, privacy, moderation_status);
create index if not exists idx_barber_profiles_publish on public.barber_profiles (business_id, active, status, sort_order);
create index if not exists idx_portfolio_publish on public.portfolio_items (business_id, status, featured, published_at desc);
create index if not exists idx_memberships_client on public.memberships (client_user_id, status, renews_at);
create index if not exists idx_referrals_code on public.referrals (business_id, code);
create index if not exists idx_feedback_follow_up on public.feedback (business_id, requires_follow_up, status, created_at desc);
create index if not exists idx_reviews_publish on public.reviews (business_id, status, published_at desc);

DO $$ BEGIN
  drop trigger if exists pages_updated_at on public.pages;
  create trigger pages_updated_at before update on public.pages for each row execute function public.set_updated_at();
  drop trigger if exists page_sections_updated_at on public.page_sections;
  create trigger page_sections_updated_at before update on public.page_sections for each row execute function public.set_updated_at();
  drop trigger if exists media_assets_updated_at on public.media_assets;
  create trigger media_assets_updated_at before update on public.media_assets for each row execute function public.set_updated_at();
  drop trigger if exists barber_profiles_updated_at on public.barber_profiles;
  create trigger barber_profiles_updated_at before update on public.barber_profiles for each row execute function public.set_updated_at();
  drop trigger if exists portfolio_items_updated_at on public.portfolio_items;
  create trigger portfolio_items_updated_at before update on public.portfolio_items for each row execute function public.set_updated_at();
  drop trigger if exists testimonials_updated_at on public.testimonials;
  create trigger testimonials_updated_at before update on public.testimonials for each row execute function public.set_updated_at();
  drop trigger if exists faqs_updated_at on public.faqs;
  create trigger faqs_updated_at before update on public.faqs for each row execute function public.set_updated_at();
  drop trigger if exists blog_posts_updated_at on public.blog_posts;
  create trigger blog_posts_updated_at before update on public.blog_posts for each row execute function public.set_updated_at();
  drop trigger if exists promotions_updated_at on public.promotions;
  create trigger promotions_updated_at before update on public.promotions for each row execute function public.set_updated_at();
  drop trigger if exists navigation_items_updated_at on public.navigation_items;
  create trigger navigation_items_updated_at before update on public.navigation_items for each row execute function public.set_updated_at();
  drop trigger if exists membership_plans_updated_at on public.membership_plans;
  create trigger membership_plans_updated_at before update on public.membership_plans for each row execute function public.set_updated_at();
  drop trigger if exists memberships_updated_at on public.memberships;
  create trigger memberships_updated_at before update on public.memberships for each row execute function public.set_updated_at();
  drop trigger if exists feedback_updated_at on public.feedback;
  create trigger feedback_updated_at before update on public.feedback for each row execute function public.set_updated_at();
  drop trigger if exists reviews_updated_at on public.reviews;
  create trigger reviews_updated_at before update on public.reviews for each row execute function public.set_updated_at();
END $$;

commit;
